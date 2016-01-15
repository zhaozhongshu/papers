title: node.js常用模块搜集
date: 2015-07-21 16:16:11
updated: 2015-07-21 16:16:45
tags:
- node.js

layout:    
comments:
categories:
permalink:
---

#目录
* **[lodash](#lodash)**
* **[optimist：命令行解析](#optimist)**
* **[uglify-js：js压缩](#uglify-js)**
* **[socket.io：websocket实现](#socket.io)**
* **[connect：用于连接各种中间件](#connect)**
* **[node_redis：redis的node客户端](#node_redis)**
* **[debug：调试模块](#debug)**
* **[q：异步promise库](#q)**
* **[debug：调试模块](#debug)**
* **[abbrev：参数预测](#abbrev)**
* **[optimist：命令行解析工具](#optimist)**
* **[chai：js测试框架](#chai)**
* **[type-detect：js类型判断](#type-detect)**
* **[deep-eql](#deep-eql)**
* **[cheerio：jquery风格的html文档解析库](#cheerio)**
* **[generic_pool：通用对象池，管理MySQL连接很优雅](#generic_pool)**
* **[iconv：文本编码转换](#iconv)**
* **[JsChardet：文本编码格式识别](#JsChardet)**
* **[Gumbo Parser:Google开发的HTML5解析引擎C99](#Gumbo Parser)**
* **[browser-request：用在浏览器上的http request库](#browser-request)**
* **[Contextify：相当于一个JS沙箱执行环境](#Contextify)**
* **[zombie.js：无窗口浏览器测试框架()可用于脚本渲染、爬虫等)](#zombie)**
* **[babeljs：一个将ES6代码转换成ES5代码的工具，因为很多浏览器对ES6语法支持不一定好](#babeljs)**
* **[htmlparser2：一个HTML/XML/RSS解析库，文档上说其性能比gumbo-parser还高5倍以上](#htmlparser2)**
* **[inherits](#inherits)**
* **[process-nextick-args](#process-nextick-args)**
* **[async.js：提供一组函数式编程工具，如map、reduce、each、walterfall等](#async.js)**
* **[hawk：HTTP认证模块](#hawk)**
* **[mime-types：根据文件名识别mime类型](#mime-types)**
* **[request：功能丰富的http request client](#request)**
* **[Node-Crawler：功能强大使用方便的爬虫](#node-crawler)**

#lodash
提供set的交、并、差、补，提供简单的模版算法，提供各种排序

#optimist
命令行解析

#uglify-js
提供js压缩功能

#socket.io
websocket模块

#connect
express中间件技术，用于连接各种中间件模块，例子：
```js
var connect = require('connect')
var http = require('http')

var app = connect()

// gzip/deflate outgoing responses
var compression = require('compression')
app.use(compression())

// store session state in browser cookie
var cookieSession = require('cookie-session')
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}))

// parse urlencoded request bodies into req.body
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded())

// respond to all requests
app.use(function(req, res){
  res.end('Hello from Connect!\n');
})

//create node.js http server and listen on port
http.createServer(app).listen(3000)
```

#node_redis
node.js的redis客户端

#debug
调试模块

#q
一个async promise库，例如，可以把这种代码：
```js
step1(function (value1) {
    step2(value1, function(value2) {
        step3(value2, function(value3) {
            step4(value3, function(value4) {
                // Do something with value4
            });
        });
    });
});
```
转换成这种代码：
```js
Q.fcall(promisedStep1)
.then(promisedStep2)
.then(promisedStep3)
.then(promisedStep4)
.then(function (value4) {
    // Do something with value4
})
.catch(function (error) {
    // Handle any error from all above steps
})
.done();
```

#mime
mime处理

#glob
通配符文件列表

#node-uuid
uuid生成

#moment
时间处理模块，生成类似于：发表于12分钟前这类的string

#grunt
前段构建工具

#less
前段构建工具

#stylus
前段构建工具

#marked
markdown解析

#when
另一个async Promises库

#node-static
静态文件服务器

#sprintf
sprintf的node实现版本

#abbrev
一个案例：我们的程序中，常常有各种输入参数，假设有["dir","path","debug"]，用户要输入完整参数，很麻烦，abbrev可以解决这个问题:
```js
var abbrev = require("abbrev");
abbrev("dir","path","debug");
```
程序生成一个新的表：
```json
{ de: 'debug',
  deb: 'debug',
  debu: 'debug',
  debug: 'debug',
  di: 'dir',
  dir: 'dir',
  p: 'path',
  pa: 'path',
  pat: 'path',
  path: 'path' }
```
这时，用户输入de,deb,debug我们都可以自动映射到debug参数，di，dir我们自动映射到dir了

#chai
一个javascript测试驱动框架
![使用参考](/images/chai_usage.png)

#type-detect
js类型检测库
```js
var type = require('type-detect');
assert('array' === type([]));
assert('array' === type(new Array()));
assert('regexp' === type(/a-z/gi));
assert('regexp' === type(new RegExp('a-z')));

(function () {
  assert('arguments' === type(arguments));
})();

assert('date' === type(new Date));

assert('string' === type('hello world'));

assert('number' === type(1));

assert('undefined' === type(undefined));
assert('undefined' !== type(null));
assert('null' === type(null));
assert('null' !== type(undefined));

var Noop = function () {};
assert('object' === type({}));
assert('object' !== type(Noop));
assert('object' === type(new Noop));
assert('object' === type(new Object));
assert('object' === type(new String('hello')));

```

#deep-eql
深度判等
```js
  - `eql(NaN, NaN).should.be.true;`
  - `eql(-0, +0).should.be.false;`
- Arguments are not Arrays:
  - `eql([], arguments).should.be.false;`
  - `eql([], Array.prototype.slice.call(arguments)).should.be.true;`
```

#cheerio
一个jquery风格的html解析库
```js
var cheerio = require('cheerio'),
    $ = cheerio.load('<h2 class="title">Hello world</h2>');

$('h2.title').text('Hello there!');
$('h2').addClass('welcome');

$.html();
//=> <h2 class="title welcome">Hello there!</h2>
```

#generic_pool
**通用对象池库**，用于管理对象资源的使用，下面的例子是使用generic pool 管理MySql连接对象
```js
// 假设2~10个连接
var poolModule = require('generic-pool');

var pool = poolModule.Pool({
    name     : 'mysql',
    create   : function(callback) {
        var Client = require('mysql').Client;
        var c = new Client();
        c.user     = 'scott';
        c.password = 'tiger';
        c.database = 'mydb';
        c.connect();
        
        // parameter order: err, resource
        // new in 1.0.6
        callback(null, c);
    },
    destroy  : function(client) { client.end(); },
    max      : 10,
    // optional. if you set this, make sure to drain() (see step 3)
    min      : 2, 
    // specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis : 30000,
     // if true, logs via console.log - can also be a function
    log : true 
});
```

**使用MySql连接代码**
```js
// acquire connection - callback function is called
// once a resource becomes available
pool.acquire(function(err, client) {
    if (err) {
        // handle error - this is generally the err from your
        // factory.create function  
    }
    else {
        client.query("select * from foo", [], function() {
            // return object back to pool
            pool.release(client);
        });
    }
});
```

**Drain pool during shutdown (反初始化对象池)**
由于构造对象池时加了参数idleTimeoutMillis = 30000，所以进程退出时可能会超过30秒。
可以通过调用setTimeout()设置对象池的超时时间，对象池会自动将超时对象关闭掉，不需要node手动删除资源。
也可以使用pool.drain()主动释放资源。
```js
// Only call this once in your application -- at the point you want
// to shutdown and stop using this pool.
pool.drain(function() {
    pool.destroyAllNow();
});
```

#iconv
是一个Node.js native模块，主要实现多种字符编码格式的转换
使用例子
**convert from UTF-8 to ISO-8859-1**
```js
    var Buffer = require('buffer').Buffer;
    var Iconv  = require('iconv').Iconv;
    var assert = require('assert');

    var iconv = new Iconv('UTF-8', 'ISO-8859-1');
    var buffer = iconv.convert('Hello, world!');
    var buffer2 = iconv.convert(new Buffer('Hello, world!'));
    assert.equals(buffer.inspect(), buffer2.inspect());
    // do something useful with the buffers
```

**A simple ISO-8859-1 to UTF-8 conversion TCP service**
```js
    var net = require('net');
    var Iconv = require('iconv').Iconv;
    var server = net.createServer(function(conn) {
      var iconv = new Iconv('latin1', 'utf-8');
      conn.pipe(iconv).pipe(conn);
    });
    server.listen(8000);
    console.log('Listening on tcp://0.0.0.0:8000/');
```

#JsChardet
python中chardet的移植，用于编码类型检测
```js   
    var jschardet = require("jschardet")
    // "àíàçã" in UTF-8
    jschardet.detect("\xc3\xa0\xc3\xad\xc3\xa0\xc3\xa7\xc3\xa3")
    // { encoding: "utf-8", confidence: 0.9690625 }
    // "次常用國字標準字體表" in Big5 
    jschardet.detect("\xa6\xb8\xb1\x60\xa5\xce\xb0\xea\xa6\x72\xbc\xd0\xb7\xc7\xa6\x72\xc5\xe9\xaa\xed")
    // { encoding: "Big5", confidence: 0.99 }
```

#Gumbo Parser
gumbo-parser是大名鼎鼎的Google html5解析引擎，全部使用std C实现，并且有Node.js的binding
https://github.com/karlwestin/node-gumbo-parser

#browser-request
是一个http-request、http-response库，主要是在浏览器js中使用，通过XMLHttpRequest完成请求
使用例子:
Fetch a resource:
```javascript
request('/some/resource.txt', function(er, response, body) {
  if(er)
    throw er;
  console.log("I got: " + body);
})
```
Send a resource:
```javascript
request.put({uri:'/some/resource.xml', body:'<foo><bar/></foo>'}, function(er, response) {
  if(er)
    throw new Error("XML PUT failed (" + er + "): HTTP status was " + response.status);
  console.log("Stored the XML");
})
```

#Contextify
把一个object转换成V8执行上下文，转换后的object就是新的执行上下文中的this，Contextify与Node.js中vm方法的不同点在于Contextify allow asynchronous functions to continue executing in the Contextified object's context
以下是一些例子
```javascript
var Contextify = require('contextify');
var sandbox = { console : console, prop1 : 'prop1'};
Contextify(sandbox);
sandbox.run('console.log(prop1);');
sandbox.dispose(); // free the resources allocated for the context.

var sandbox = Contextify(); // returns an empty contextified object.
sandbox.run('var x = 3;');
console.log(sandbox.x); // prints 3
sandbox.dispose();

//沙箱中的异步函数也可以执行
var sandbox = Contextify({setTimeout : setTimeout});
sandbox.run("setTimeout(function () { x = 3; }, 5);");
console.log(sandbox.x); // prints undefined
setTimeout(function () {
    console.log(sandbox.x); // prints 3
    sandbox.dispose();
}, 10);
```

**主要接口**

* Contextify([sandbox])
```
    sandbox - The object to contextify, which will be modified as described below
              If no sandbox is specified, an empty object will be allocated and used instead.

    Returns the contextified object.  It doesn't make a copy, so if you already have a reference
    to the sandbox, you don't need to catch the return value.
```
A Contextified object has 2 methods added to it:

* run(code, [filename])

    code - string containing JavaScript to execute
    filename  - an optional filename for debugging.

    Runs the code in the Contextified object's context.

* getGlobal()

Returns the actual global object for the V8 context.  The global object is initialized with interceptors (discussed below) which forward accesses on it to the contextified object.  This means the contextified object acts like the global object in most cases.  Sometimes, though, you need to make a reference to the actual global object.

For example:

```javascript
var window = Contextify({console : console});
window.window = window;
window.run("console.log(window === this);");
// prints false.
```

```javascript
var window = Contextify({console : console});
window.window = window.getGlobal();
window.run("console.log(window === this);");
// prints true
```
The global object returned by getGlobal() can be treated like the contextified sandbox object, except that defining getters/setters will not work on it.  Define getters and setters on the actual sandbox object instead.

* dispose()

Frees the memory allocated for the underlying V8 context.  If you don't call this when you're done, the V8 context memory will leak, as will the sandbox memory, since the context's global stores a strong reference to the sandbox object.  You can still use your sandbox object after calling dispose(), but it's unsafe to use a global previously returned from getGlobal().  run, getGlobal, and dispose will be removed from the sandbox object.

## require('vm') vs. Contextify
Node's vm functions (runInContext etc) work by copying the values from the sandbox object onto a context's global object, executing the passed in script, then copying the results back.  This means that scripts that create asynchronous functions (using mechanisms like setTimeout) won't have see the results of executing those functions, since the copying in/out only occurs during an explicit call to runInContext and friends.  
Contextify creates a V8 context, and uses interceptors (see: http://code.google.com/apis/v8/embed.html#interceptors) to forward global object accesses to the sandbox object.  This means there is no copying in or out, so asynchronous functions have the expected effect on the sandbox object.  


#zombie
Insanely fast, full-stack, headless browser testing using node.js

#babeljs
一个可以把你写的 ES6 的代码编译成 ES5 并在现代浏览器中运行的工具。他们也有一个不错的介绍 ES6 的文档。
https://github.com/babel/babel

#htmlparser2
一个HTML/XML/RSS解析库，文档上说其性能比gumbo-parser还高5倍以上(是不是额？)
一个使用例子：
```javascript
var htmlparser = require("htmlparser2");
var parser = new htmlparser.Parser({
    onopentag: function(name, attribs){
        if(name === "script" && attribs.type === "text/javascript"){
            console.log("JS! Hooray!");
        }
    },
    ontext: function(text){
        console.log("-->", text);
    },
    onclosetag: function(tagname){
        if(tagname === "script"){
            console.log("That's it?!");
        }
    }
}, {decodeEntities: true});
parser.write("Xyz <script type='text/javascript'>var foo = '<<bar>>';</ script>");
parser.end();
```
Output (simplified):

```javascript
-> Xyz 
JS! Hooray!
-> var foo = '<<bar>>';
That is it?!
```

#inherits

Browser-friendly inheritance fully compatible with standard node.js
使用案例：
```js
var inherits = require('inherits');
// then use exactly as the standard one

function Child() {
  Parent.call(this)
  test(this)
}

function Parent() {}

inherits(Child, Parent)
```

#process-nextick-args
很简单，就是封装process.nextTick调用
Always be able to pass arguments to process.nextTick, no matter the platform
```js
var nextTick = require('process-nextick-args');

nextTick(function (a, b, c) {
  console.log(a, b, c);
}, 'step', 3,  'profit');
```

#async.js
提供一组工具函数，实现一种函数式编程模式，它提供的是一种编程模式

#hawk
Hawk是一套HTTP认证策略，用于提供client、server端认证

#mime-types
根据文件后缀名，查询mime类型，例如：
```js
mime.lookup('json')             // 'application/json'
mime.lookup('.md')              // 'text/x-markdown'
mime.lookup('file.html')        // 'text/html'
mime.lookup('folder/file.js')   // 'application/javascript'
mime.lookup('folder/.htaccess') // false

mime.lookup('cats') // false
```

#request
一个功能丰富的http request client，它支持proxy设置，`application/x-www-form-urlencoded` and `multipart/form-data` form uploads. For `multipart/related` refer to the `multipart`
同时支持HTTP Authentication、OAuth Signing

#node-crawler
网站爬虫程序
node-crawler aims to be the best crawling/scraping package for Node.
It features:
* A clean, simple API
* server-side DOM & automatic jQuery insertion with Cheerio (default) or JSDOM
* Configurable pool size and retries
* Priority of requests
* forceUTF8 mode to let node-crawler deal for you with charset detection and conversion
* A local cache
* node 0.10 and 0.12 support