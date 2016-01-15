title: node.js内存泄露调试记录
date: 2015-07-22 20:08:18
updated: 2015-07-22 20:08:41
tags:
- node.js
- 调试

layout:    
comments:
categories:
permalink:
---

* **[问题](#问题)**
* **[内存泄露检测memwatch](#内存泄露检测memwatch)**
* **[Heapdump v8堆分析](#heapdumpv8堆分析)**
* **[总结](#总结)**

#问题
node.js中内存泄露一般指有些没有适用的对象，引用计数未清零，通常产生在闭包生成过程中。
下面就是遇到的一粒内存泄露问题，先上代码：
```js
c.queue({
    uri:'http://www.qq.com/',
    jQuery:true,
    callback: OnRequest
});

function OnRequest(error, result, $) {
    if( error ){
        return;
    }
    else if( $ === undefined ){
        return;
    }
    $('a').each(function(index, a) {
        var task = {uri: $(a).attr('href'), jQuery:true, callback: OnRequest};
        c.queue(task);
    });
}
```
在运行过程中，发现内存占用不断飙升，一会时间就是几百兆。
碰到这类问题怎么办？

#内存泄露检测memwatch
有一个开源模块memwatch，就是用来做内存泄露检测的，上代码：
```js
//安装
npm install memwatch --save

memwatch.on('leak', function(info) {
 console.error('Memory leak detected: ', info);
});
```
如果有内存泄露，它会触发leak事件，打印泄露信息:
```js
{
 start: Fri Jan 02 2015 10:38:49 GMT+0000 (GMT),
 end: Fri Jan 02 2015 10:38:50 GMT+0000 (GMT),
 growth: 7620560,
 reason: 'heap growth over 5 consecutive GCs (1s) - -2147483648 bytes/hr'
}
```
看来memwatch也检测到内存泄露了
leak事件定义：

    A leak event will be emitted when your heap usage has increased for five consecutive garbage collections

还能给出有助于定位泄露问题的数据吗？
**我们还可以用memwatch做内存diff检测**
```js
var hd;
memwatch.on('leak', function(info) {
 console.error(info);
 if (!hd) {
   hd = new memwatch.HeapDiff();
 } else {
   var diff = hd.end();
   console.error(util.inspect(diff, true, null));
   hd = null;
 }
});
```
打印两次泄露时，堆内存的diff
```js
{ '-': 6,
  '+': 7,
  size: '68 bytes',
  size_bytes: 68,
  what: 'Socket' },
{ '-': 1395,
  '+': 165074,
  size: '117.84 mb',
  size_bytes: 123560084,
  what: 'String' },
{ '-': 4, '+': 5, size: '16 bytes', size_bytes: 16, what: 'TCP' },
{ '-': 39,
  '+': 1,
  size: '-1.34 kb',
  size_bytes: -1368,
  what: 'Timeout' },
```
确实发现了一些有用信息，基本上String对象泄露最严重
我们现在知道大概是某个地方的String对象引用问题

接下来我们可以dump以下V8的heap，用chrome profile工具来分析到底是哪些String对象被泄露

#heapdumpv8堆分析
还是先上代码：
```js
//安装
npm install heapdump --save

memwatch.on('leak', function(info) {
 console.error(info);
 var file = __filename__ + '-' + Date.now() + '.heapsnapshot';
 heapdump.writeSnapshot(file, function(err){
   if (err) console.error(err);
   else console.error('Wrote snapshot: ' + file);
  });
});
```
在泄露时写入heap 快照，然后可以用chrome的profile工具load快照看一下
![chrome中加载快照](/images/heap_detect.png)
可以看到是uri引用导致大量的对象被引用，而OnRequest函数由于闭包的存在，会引用$变量，导致大量对象没有被garbage connect。
知道原因了，修改代码如下：
```js
function OnRequest(error, result, $) {
    if( error ){
        return;
    }
    else if( $ === undefined ){
        return;
    }
    var hrefs = [];
    $('a').each(function(index, a) {
        hrefs.push($(a).attr('href'));
    });
    $ = null;

    for (var href in hrefs){
        var task = {uri: href, jQuery:true, callback: OnRequest};
        c.queue(task);
    }
}
```

#总结
闭包虽好，但是可能会有潜在问题
