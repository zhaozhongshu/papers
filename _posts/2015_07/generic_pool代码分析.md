title: generic_pool代码分析
date: 2015-07-24 14:12:14
updated: 2015-07-24 14:12:10
tags:
- node.js

layout:    
comments:
categories:
permalink:
---

现在温习一下它提供的调用接口，如下代码定义资源池
```js
// 假设2~10个连接
var Pool = require('generic-pool').Pool;
var Client = require('mysql').Client;
var arguments = {
    //创建资源回调函数
    create   : function(callback) {
        var res = new Client({user:'xxx',password:'yyy',database:'db'});
        res.connect();
        //err, res
        callback(null, res);
    },
    //销毁资源回调函数
    destroy  : function(res) { res.end(); },
    //判定资源是否有效(无效的化，从pool中清除 在require前回调)
    validate : function(res) { return true },
    //资源池最大、最小数
    max      : 3,
    min      : 0,
    //资源空闲多少时间后，就应该destory
    idleTimeoutMillis : 30,
};
var pool = Pool(arguments);
```

**如何使用资源池**
```js
pool.acquire(function(err, res) {
    if (err) {
        //资源池错误
    }
    //使用资源池，使用完成后需要回收资源
    else {
        res.query("select * from foo", [], function() {pool.release(res);});
    }
});
```

**反初始化对象池**
也可以使用pool.drain()主动释放资源。
```js
pool.drain(function() {
    pool.destroyAllNow();
});
```
总结一下，资源池使用主要分为：
1.定义资源，create、destory函数
2.require、release使用释放资源，可能异步

**下面是资源池的实现**
```js

exports.Pool = function (factory) {
  var me = {};
  var idleTimeoutMillis = factory.idleTimeoutMillis || 30000;
  var reapInterval = factory.reapIntervalMillis || 1000;
  var refreshIdle = ('refreshIdle' in factory) ? factory.refreshIdle : true;
  var resources = [];    //可用资源列表
  var pendings = [];
  var count = 0;    //资源数
  var removeIdleScheduled = false;
  var removeIdleTimer = null;
  var draining = false; //对象池析构中
  var returnToHead = factory.returnToHead || false,

  factory.validate = factory.validate || function() { return true; };    
  factory.max = parseInt(factory.max, 10);
  factory.min = parseInt(factory.min, 10);
  factory.max = Math.max(isNaN(factory.max) ? 1 : factory.max, 1);
  factory.min = Math.min(isNaN(factory.min) ? 0 : factory.min, factory.max-1);
  
  removeIdleTimer = setTimeout(removeIdle, reapInterval);

  //请求资源
  me.require = function (cb) {
    pendings.push(cb);
    dispense();
  };
  //wakeup等待的请求
  function dispense() {
    if( pendings.length == 0 ){
        return;
    }
    while (resources.length > 0 ) {
      var res = resources[0];
      //清除无效资源
      if (!factory.validate(res.obj)) {
        me.destroy(res.obj);
        continue;
      }
      resources.shift();
      var cb = pendings.shift();
      return cb(null, res.obj);
    }
    //创建资源满足pending request
    if (count < factory.max && pendings.length > 0) {
        createResource();
    }
  }
  //调用create创建资源
  function createResource() {

    var onCreate = function (err,obj) {
      var req = pendings.shift();

      count += err ? 0 : 1;

      req(err, obj);

      if( pendings.length > 0 ){
          process.nextTick(function(){dispense();});
      }
    }

    factory.create(onCreate);
  }


  me.release = function (obj) {
    //重复release?
    if (resources.some(function(item) { return (item.obj === obj); })) {
      return;
    }

    var objWithTimeout = { obj: obj, timeout: (new Date().getTime() + idleTimeoutMillis) };
    if(returnToHead){
      resources.splice(0, 0, objWithTimeout);      
    }
    else{
      resources.push(objWithTimeout);  
    }    
    
    if( pendings.length > 0 ){
        dispense();
    }
    
    scheduleRemoveIdle();
  };

  function scheduleRemoveIdle() {
    if (!removeIdleScheduled) {
      removeIdleScheduled = true;
      removeIdleTimer = setTimeout(removeIdle, reapInterval);
    }
  }

  //删除资源
  me.destroy = function(obj) {
    count -= 1;
    resources.remove(obj);
    //资源释放回调
    factory.destroy(obj);
    ensureMinimum();
  };

  /**
   * Checks and removes the available (idle) clients that have timed out.
   */
  function removeIdle() {
    var toRemove = [],
        now = new Date().getTime(),
        i,
        al, tr,
        timeout;

    removeIdleScheduled = false;

    // Go through the available (idle) items,
    // check if they have timed out
    for (i = 0, al = resources.length; i < al && (refreshIdle || (count - factory.min > toRemove.length)); i += 1) {
      timeout = resources[i].timeout;
      if (now >= timeout) {
        // Client timed out, so destroy it.
        log("removeIdle() destroying obj - now:" + now + " timeout:" + timeout, 'verbose');
        toRemove.push(resources[i].obj);
      } 
    }

    for (i = 0, tr = toRemove.length; i < tr; i += 1) {
      me.destroy(toRemove[i]);
    }

    // Replace the available items with the ones to keep.
    al = resources.length;

    if (al > 0) {
      log("resources.length=" + al, 'verbose');
      scheduleRemoveIdle();
    } else {
      log("removeIdle() all objects removed", 'verbose');
    }
  }

  /**
   * Handle callbacks with either the [obj] or [err, obj] arguments in an
   * adaptive manner. Uses the `cb.length` property to determine the number
   * of arguments expected by `cb`.
   */
  function adjustCallback(cb, err, obj) {
    if (!cb) return;
    if (cb.length <= 1) {
      cb(obj);
    } else {
      cb(err, obj);
    }
  }
  
  function ensureMinimum() {
    var i, diff;
    if (!draining && (count < factory.min)) {
      diff = factory.min - count;
      for (i = 0; i < diff; i++) {
        createResource();
      }
    }
  }

  me.borrow = function (callback, priority) {
    log("borrow() is deprecated. use acquire() instead", 'warn');
    me.acquire(callback, priority);
  };

  me.returnToPool = function (obj) {
    log("returnToPool() is deprecated. use release() instead", 'warn');
    me.release(obj);
  };

  /**
   * Disallow any new requests and let the request backlog dissapate.
   *
   * @param {Function} callback
   *   Optional. Callback invoked when all work is done and all clients have been
   *   released.
   */
  me.drain = function(callback) {
    log("draining", 'info');

    // disable the ability to put more work on the queue.
    draining = true;

    var check = function() {
      if (pendings.size() > 0) {
        // wait until all client requests have been satisfied.
        setTimeout(check, 100);
      } else if (resources.length != count) {
        // wait until all objects have been released.
        setTimeout(check, 100);
      } else {
        if (callback) {
          callback();
        }
      }
    };
    check();
  };

  /**
   * Forcibly destroys all clients regardless of timeout.  Intended to be
   * invoked as part of a drain.  Does not prevent the creation of new
   * clients as a result of subsequent calls to acquire.
   *
   * Note that if factory.min > 0, the pool will destroy all idle resources
   * in the pool, but replace them with newly created resources up to the
   * specified factory.min value.  If this is not desired, set factory.min
   * to zero before calling destroyAllNow()
   *
   * @param {Function} callback
   *   Optional. Callback invoked after all existing clients are destroyed.
   */
  me.destroyAllNow = function(callback) {
    log("force destroying all objects", 'info');
    var willDie = resources;
    resources = [];
    var obj = willDie.shift();
    while (obj !== null && obj !== undefined) {
      me.destroy(obj.obj);
      obj = willDie.shift();
    }
    removeIdleScheduled = false;
    clearTimeout(removeIdleTimer);
    if (callback) {
      callback();
    }
  };

  /**
   * Decorates a function to use a acquired client from the object pool when called.
   *
   * @param {Function} decorated
   *   The decorated function, accepting a client as the first argument and 
   *   (optionally) a callback as the final argument.
   *
   * @param {Number} priority
   *   Optional.  Integer between 0 and (priorityRange - 1).  Specifies the priority
   *   of the caller if there are no available resources.  Lower numbers mean higher
   *   priority.
   */
  me.pooled = function(decorated, priority) {
    return function() {
      var callerArgs = arguments;
      var callerCallback = callerArgs[callerArgs.length - 1];
      var callerHasCallback = typeof callerCallback === 'function';
      me.acquire(function(err, client) {
        if(err) {
          if(callerHasCallback) {
            callerCallback(err);
          }
          return;
        }

        var args = [client].concat(Array.prototype.slice.call(callerArgs, 0, callerHasCallback ? -1 : undefined));
        args.push(function() {
          me.release(client);
          if(callerHasCallback) {
            callerCallback.apply(null, arguments);
          }
        });
        
        decorated.apply(null, args);
      }, priority);
    };
  };

  me.getPoolSize = function() {
    return count;
  };

  me.getName = function() {
    return factory.name;
  };

  me.resourcesCount = function() {
    return resources.length;
  };

  me.pendingsCount = function() {
    return pendings.size();
  };


  // create initial resources (if factory.min > 0)
  ensureMinimum();

  return me;
};

```