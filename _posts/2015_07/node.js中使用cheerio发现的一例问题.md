title: node.js中使用cheerio发现的一例问题
date: 2015-07-28 10:51:59
updated: 2015-07-28 10:52:10
tags:
- node.js
---

我在node.js中使用cheerio库解析html时，发现一例问题，先贴代码:
```js
$('a').each(function (i, elem) {
    var href = this.attribs['href'];
    cacheTask.push(href);   //保存一个url链接
});
$ = null;
```
代码提取了html中所有的url链接，并保存到hrefs变量中，在运行时，发现内存占用飙升很快。采集堆数据后，load进chrome看到：
![cheerio_heap1.png](/images/cheerio_heap1.png)
可以看到，string、buffer对象占了绝大部分内存，点开一个String对象看一下：
![cheerio_heap2.png](/images/cheerio_heap2.png)
从图中可以看到，有一个html文档字符串泄露，堆上看到的引用关系：
'http://www.iqiyi.com/v_...'对象的parent变量引用了它
url变量引用了这个字符串'http://www.iqiyi.com/v_...'
cacheTask数组又引用了url变量

找到原因了，因为cacheTask.push(href)保存了html页面中的字符子串的引用，导致了整个html页面也被引用，真是一个奇葩的bug。Google了一下，发现老版本的V8引擎确实存在这个问题。

网上找到的解决方案：
```js
var href = '$' + this.attribs['href'];
href = href.substr(1);
```
还有就是升级node.js