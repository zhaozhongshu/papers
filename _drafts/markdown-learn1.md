title: markdown学习笔记
date: 2015-06-10 17:15:30
tags:
---

#1. 标题设置(改变字体大小)

在文本开头添加N个\#代表N级标题

#2. 引用块

通过在文字开头添加\>表示块引用.(当\>和文字之间添加五个空格时，块注释的文字会有变化)
>     这是带5个空格的引用
>这是不带5个空格的引用

#3. 斜体

将需要设置为斜体的文字两端使用1个\*或者\_夹起来
*斜体内容1*
_斜体内容2_

#4. 粗体  

将需要设置为斜体的文字两端使用2个\*\*或者\_\_夹起来
**这是粗体内容**

#5. 无序列表
在文字开头添加(\*, \+, 或\-)实现无序列表。但是要注意在(\*, \+, 或\-)和文字之间需要添加空格(建议：一个文档中只是用一种无序列表的表示方式)
* 内容1
* 内容2
* 内容3

#6. 有序列表
使用数字后面跟上句号\.加空格 例如1. 内容1
1. 内容1
2. 内容2
3. 内容3

#7. 链接（Links）
Markdown中有两种方式，实现链接，分别为内联方式和引用方式。
>内联方式：This is an [引用链接1](http://example.com/).
>引用方式：[引用链接1][1] than from [引用链接2][2] 

>[1]: http://google.com/        "Google"
>[2]: http://search.yahoo.com/  "Yahoo Search"

[这是百度链接1](http://www.baidu.com)

#8. 图片（Images）
图片的处理方式和链接的处理方式，非常的类似。
>内联方式：\!\[图片1\](/path/to/img.jpg "Title")
>引用方式：\!\[图片1\][id] 
>[id]: /path/to/img.jpg "Title"

>\!\[图片1\](/images/1.png "测试图片添加")
![图片1](/images/1.png "测试图片添加")

#9. 数学公式
＼[J_\alpha(x) = \sum_{m=0}^\infty \frac{(-1)^m}{m! \Gamma (m + \alpha + 1)} {\left({ \frac{x}{2} }\right)}^{2m + \alpha}＼]

Simple inline $a = b + c$.