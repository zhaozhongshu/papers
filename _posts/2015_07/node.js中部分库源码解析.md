title: node.js中部分库解析
date: 2015-07-21 15:30:01
updated: 2015-07-24 14:12:20
tags:
- node.js
- js

layout:    
comments:
categories:
permalink:

---

* **[util库](#util库)**
* **[npm库](#npm库)**

#util库
```js
util.format(fmt,...); 
```
格式化字符串,里面实现中用到了string.replace(/%[sdj%]/g, callback)，用callback返回值替换正则token
%%  输入%
%s  输入字符串
%d  输入Number
%j  输入json对象(任意对象通过JSON.stringify转成json)

```js
util.deprecate(fn, msg); 
```
标记一个函数为deprecate，它的实现比较有意思，是指是返回一个wrapper函数，在首次调用时，给出提示
```js
exports.deprecate = function(fn, msg) {
  if (isUndefined(global.process)) {  //startup过程中global.process对象还没建立起来，这时可以延迟到调用目标函数时，才调用deprecate
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }
  return deprecated;
};
```

```js
util.inspect(obj, opts)
```
更详细的展示一个obj

```js
util.inherits(ctor, superCtor);
```
继承
```js
util._extend(origin, add)
```
将add对象中所有成员拷贝的origin对象中，同时会覆盖原来的字段g

#npm库

**在一个目录下创建一个package**
在目录下执行

    npm init

**添加一个package依赖**
``` 
npm install https://github.com/sylvinus/node-crawler.git b --save
```
他会在package.json文件中dependencies添加一项


npm是node.js软件中配套的包管理工具，使用起来非常方便，例如：
要安装某个包，只需：
```js
npm install xxx即可
```
我们先从npm.cmd开始,npm.cmd文件内容如下
```js
node "%~dp0\.\node_modules\npm\bin\npm-cli.js" %*
```
npm-cli.js代码：
```js
(function () { // wrapper in case we're in module_context mode
var fs = require("graceful-fs")
  , path = require("path")
  , npm = require("../lib/npm.js")
  , npmconf = require("npmconf")
  , errorHandler = require("../lib/utils/error-handler.js")
  , configDefs = npmconf.defs
  , shorthands = configDefs.shorthands
  , types = configDefs.types
  , nopt = require("nopt")

var conf = nopt(types, shorthands)
npm.argv = conf.argv.remain
if (npm.deref(npm.argv[0])) 
    npm.command = npm.argv.shift()

process.on("uncaughtException", errorHandler)

conf._exit = true
npm.load(conf, function (er) {
  if (er) return errorHandler(er)
  npm.commands[npm.command](npm.argv, errorHandler)
})
})()
```
(function(){...})() 这样执行函数的有个好处：不污染js环境。
从代码中可以看到，npm-cli.js调用npm.js中的功能npm.load(conf);，我们看一下conf都有哪些参数？在load前假如一行console.log(conf)看一下输出
```js
C:\>npm search crawler
{ argv:
   { remain: [ 'crawler' ],
     cooked: [ 'search', 'crawler' ],
     original: [ 'search', 'crawler' ] },
  _exit: true }
No match found for "crawler"
```
接下来看npm.js的代码
```js
;(function(){
...
Object.keys(abbrevs).concat(plumbing).forEach(
function addCommand (c) {
  Object.defineProperty(npm.commands, c, 
  { get : function () {
    var a = npm.deref(c)
    if (c === "la" || c === "ll") 
      npm.config.set("long", true)

    npm.command = c
    if (commandCache[a]) return commandCache[a]
    //调用对应命令的js文件
    var cmd = require(__dirname+"/"+a+".js")
    commandCache[a] = function () {
      ...
      cmd.apply(npm, args)
    }
    Object.keys(cmd).forEach(function (k) {
      commandCache[a][k] = cmd[k]
    })
    return commandCache[a]
  }
  })
  ...
```

**查看npm系统配置**
```js
C:\>npm config ls
; cli configs
registry = "http://registry.npm.taobao.org/"
user-agent = "npm/1.4.14 node/v0.10.29 win32 ia32"

; userconfig C:\Users\zzs\.npmrc
registry = "http://registry.npm.taobao.org/"

; builtin config undefined
prefix = "C:\\Users\\zzs\\AppData\\Roaming\\npm"

; node bin location = C:\Program Files (x86)\nodejs\\node.exe
; cwd = C:\
; HOME = C:\Users\zzs
; 'npm config ls -l' to show all defaults.

```