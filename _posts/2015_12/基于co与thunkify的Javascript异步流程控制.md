title: 基于co与thunkify的Javascript异步流程控制
date: 2015-12-08 09:33:00
updated: 2015-12-08 09:33:03
tags:
- Node.js
- javascript
- js

layout:
comments:
categories:
permalink:

---
* **[generator简介](#1.generator简介)**
* **[使用generator替代callback](#2.使用generator替代callback)**
* **[thunkify库](#3.thunkify库)**
* **[co库](#4.co库)**
* **[generator执行流程分析](#5.generator执行流程分析)**


# 1.generator简介

在js中，一个function一般有两个状态：被调用、未被调用。但是在ES6中，js里添加了一个新的类型：generator，它是一中特殊的函数：可以在函数体内临时退出、以后再进入，在临时退出后，函数调用上下文(variable bindings)被临时保存，看上去就像函数被暂停一样，举个例子：
```javascript
斐波拉契数列的generator
function* fib() {
    var v1 = 0, v2 = 1;
    console.log(yield v1);
    console.log(yield v2);
    while (true) {
        v2 = v2 + v1;
        console.log(yield v2);
        v1 = v2 - v1;
    }
}

var gen = fib();
for (var i = 0; i < 10; i++) {
    console.log(gen.next('get fib '+i).value);
}
```
输出结果：
```javascript
0
get fib 1
1
get fib 2
1
get fib 3
2
get fib 4
3
get fib 5
5
get fib 6
8
get fib 7
13
get fib 8
21
get fib 9
34
```
generator函数在function后面要紧跟一个*，函数并不马上执行，需要外部调用fn.next()驱动执行，函数体中，执行yield时，会将yield后的表达式求值，fn.next()返回** {value:yield后的表达式值, done: false} **，当外部再次调用fn.next(arg)时，函数体从yield处恢复，并将arg传给yield左边表达式,当fn.next()返回的done为true时，表示generator函数执行完成。
从前面的结果看出：第一次调用fn.next('get fib 0')并没有传递到generator函数中，同时,next函数只接受1个参数

# 2.使用generator替代callback

Node.js中异步回调导致代码逻辑碎片化，我们可以用generator实现更直观的异步回调，先举个异步回调的例子:
```javascript
// 用setTimeout模拟某些异步操作
function task () {
    console.log('do task1');
    // do task1
    setTimeout(function (result1) {
        console.log('on task1');
        console.log('do task2');
        setTimeout(function  (result2) {
            console.log('on task2');
            console.log('do task3');
            setTimeout(function (result3) {
                console.log('on task3');
            })
        }, 2000);
    }, 1000);
};
task();
```
从上面的代码中可以看出，由于大量回调的存在，流程很不清晰，我们用generator改造一下，代码实现如下：
```javascript
//这里我们需要改造一下setTimeout函数,将handler(args..., cb)形式改为handler(args...)(cb)
//因为yield需要返回一个Promise对象(或者inject callback)用于continue
function tsetTimeout(timeo) {
    var callback = null;
    setTimeout(function cb() {
        if (callback) {
            callback();
        }
    }, timeo);                  //触发异步API
    return function (cb) {      //返回注入函数
        callback = cb;
    };
}

function* task () {
    console.log('do task1');
    yield tsetTimeout(1000);    //其实返回了一个函数对象
    
    console.log('do task2');
    yield tsetTimeout(2000);
    
    console.log('do task3');
    yield tsetTimeout(2000);
}

//推动generator run起来
var handler = task();
handler.next().value(function next_cb() {
    var ret = handler.next();
    if (!ret.done) {
        ret.value(next_cb);
    }
});
```

# 3.thunkify库
上面的代码中，task函数看上去同步化了，但问题又来了，我们在代码中对setTimeout做了封装，如果对node所有的API都做封装，是一个不小的工作量。幸好有一个开源库thunkify帮我们做好了，该库的效果如下:
```javascript
var readFile =  thunkify(fs.readFile);
readFile('files.txt')(function (err, data) {
    console.log(data);
});
```
再看一下它的实现：
```javascript
function thunkify(fn){
    // 返回wrapper函数，wrapper函数不立刻执行fn,而仅仅是保存参数
    return function(){
      var args = Array.prototype.slice.call(arguments);
      var ctx = this;
      // wrapper函数返回一个新函数,caller可以在新函数调用中设置done回调函数
      return function(done){
        args.push(function(){
          done.apply(null, arguments);
        });
        try {
          fn.apply(ctx, args);
        } catch (err) {
          done(err);
        }
      }
    }
};
```
通过thunkify，我们可以写出这样的代码:
```javascript
// API函数thunk化
var readFile = thunkify(fs.readFile);
function* task () {
    console.log('read file1');
    var err1,data1 = yield readFile('file1.txt');
    console.log('file1 ' + data1[1]);
    
    console.log('read file2');
    var err2,data2 = yield readFile('file2.txt');
    console.log('file2 ' + data2[1]);
    
    console.log('read file3');
    var err3,data3 = yield readFile('file3.txt');
    console.log('file3 ' + data3[1]);
}

var handler = task();
handler.next().value(function next_cb(err, dat) {
    var ret = handler.next([err, dat]);
    if (!ret.done) {
        ret.value(next_cb);
    }
});
```

输出结果如下:
```javascript
file1 file1.txt data
read file2
file2 file2.txt data
read file3
file3 file3.txt data
```
函数的异常也被传递到generator中去了。

# 4.co库
现在我们看一下co库是怎么实现的：
```javascript
co(function* () {
  var result = yield Promise.resolve(true);
  return result;
}).then(function (value) {
  console.log(value);
}, function (err) {
  console.error(err.stack);
});
```
可以看到，co的实现有一个不好的地方，就是异常处理，有时候，我希望在generator中处理异常，所以我要实现一个特殊的co_call，它需要满足以下接口
```javascript
co_call(generator, get_return_cb, generator arguments...);
//例如

co_call(function* (param) {
        console.log('func arg:' + param);
        console.log('read file1');
        var ret1 = yield readFile('file1.txt');
        console.log('file1:' + ret1[1]);
    
        console.log('read file2');
        var ret2 = yield readFile('file2.txt');
        console.log('file2:' + ret2[1]);
    
        console.log('read file3');
        var ret3 = yield readFile('file3.txt');
        console.log('file3:' + ret3[1]);
    
        console.log('read file1~3');
        var ret4 = yield [readFile('file1.txt'), readFile('file2.txt'), readFile('file3.txt')];
        console.log('file1~3:' + ret4[0][1]+"|"+ret4[1][1]+"|"+ret4[2][1]);
    
        return "ret value:" + ret1[1] + ret2[1];
    }, 
    function (ret) {
        console.log(ret);
    }, 
    'first_arg', 'second_arg');
```
输出结果如下:
```javascript
func arg:first_arg,second_arg
read file1
file1:file1.txt
read file2
file2:file2.txt
read file3
file3:file3.txt
read file1~3
file1~3:file1.txt|file2.txt|file3.txt
ret value:file1.txtfile2.txt
```


co_call实现如下:
```javascript
var co_call = function (flow, get_return) {
    var slice = Array.prototype.slice;
    // generator的参数
    var gen = flow(slice.call(arguments, 2));
    var next = function (data) {
        // data赋值给yield左值&从yield处执行flow知道下一个yield
        // 返回yield右值& ret.value是个thunk
        var ret = gen.next(data);
        if (ret.done) {
            get_return(ret.value);
            return;
        }
        //返回一组thunk函数?
        if (Array.isArray(ret.value)) {
            var count = ret.value.length;
            // 返回一个二维数组
            var results = [];
            ret.value.forEach(function (item, index) {
                item(function () {
                    count--;
                    results[index] = slice.call(arguments);
                    if (count === 0) {
                        next(results);
                    }
                });
            });
        } else {
            ret.value(function () {
                // 异步回调的所有返回值生成新数组，传给yield左值
                next(slice.call(arguments));
            });
        }
    }
    next();
};
```


# 5.generator执行流程分析
我们从一个简单例子里看一下generator的执行顺序：
```javascript
function* generator_fn(args){
    var ret1 = yield code_block1;
    var ret2 = yield code_block2; 
    return ret3;
}

var gen = generator_fn(code_block1);
do
{
var ret = gen.next(code_block2);
}while(!ret.done);

ret.value;
```

**1. 先计算code_block1,返回值作为generator_fn的参数**
**2. generator_fn返回生成器，赋值给变量gen**
**3. 计算code_block2,返回值作为gen.next参数**
**4. 恢复执行generator_fn(第一次gen.next传入参数被丢弃),否则取第一个参数赋给yield左值**
**5. generator_fn函数的return,返回值给ret.value**
