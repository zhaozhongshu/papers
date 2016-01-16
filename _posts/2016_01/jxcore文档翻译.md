title: jxcore文档翻译
date: 2016-01-16 16:21:13
updated: 2016-01-16 16:21:16
tags:
- Node.js
- javascript
- js
- jxcore

layout:
comments:
categories:
permalink:

---
* **[JXcore config](#JXcoreConfig)**
* **[Memory Store](#MemoryStore)**
* **[Multitasking](#Multitasking)**
* **[Module Installer](#ModuleInstaller)**
* **[Packaging](#Packaging)**

# JXcoreConfig


可以通过修改配置文件jx.config（windows下是node.config）

    {
    "maxCPU":50
    }

maxCPU为50表示，限制node的CPU占用率最高50%，如果想限制某个node程序的CPU使用率，比如/test/myapp/index.js，可以在/test/myapp下创建文件index.js.jxcore.config:
 
	{
	    "maxCPU":100
	}

这个例子如果与jx monitor组合起来用，会非常有用，当打到CPU限制时，jxcore monitor可以自动重启目标程序

可以用portTCP, portTCPS限制程序的TCP侦听端口范围，例如：

	index.js.jxcore.config:
	{
	"portTCP": 8080
	}

index.js:

	var http = require('http');
	http.createServer(function (req, res) {
	    res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World\n');
	}).listen(1337);

例子中，侦听1337端口，但config中配置的端口为8080，程序会自动替换端口为8080，portTCP对UDP、TCP都有效，portTCPS只影响https

**allowMonitoringAPI**变量用于控制是否开启monitor，即jxcore.monitor下的函数是否可用，默认为true，jxcore.monitor下的函数可见

	jx.config:
	{
	    "allowMonitoringAPI": false
	}

**ALLOWCUSTOMSOCKETPORT**变量：是否可以侦听自定义端口


**maxMemory**: 限制程序的最大内存占用KB，超过最大内存后，jxcore自动退出

	/tmp/test/index.js.jxcore.config
	{
	    "maxMemory":131072
	}

限制内存最大64MB.

**allowSysExec**: (boolean) 限制是否有权限创建子进程
**globalModulePath**: (string) 定义系统node.js模块保存路径
**allowLocalNativeModules**: (boolean)
**globalApplicationConfigPath**: (string) 
**npmjxPath**: (string)

# MemoryStore

jxcore提供高效的内存存储功能，它是基于Google的**cpp-btree库**
Memory Store的最大好处是非常高的访问速度、非常低的内存占用，**Memory Store没有放在V8的堆空间中**，不受V8堆的大小限制
Memory Store与标准的k/v数据库类似。key值必须全局唯一，且为string类型（如果是number类型，它会自动转换成string类型）
Memory store是一个全局对象:

	var store = jxcore.store;
	或用于多实例访问:
	var shared = jxcore.store.shared;


**jxcore.store#**
如果使用multi-tasking，每个sub-instance都有自己的jxcore.store对象，sub-instance之间不能共享jxcore.store对象

**store.exists(key, element)**

若存在返回true

	var store = jxcore.store;
	if (!store.exists("111")) {
	    store.set("111", "test");
	}

**store.get(key)**

返回key对应value字符串，同时删除<key，value>对，若不存在key，返回undefined

	jxcore.store.set("key1", "value1");
	// below line outputs: "value for key1: value1"
	console.log("value for key1:", jxcore.store.get("key1"));
	// another call of get() outputs: "value for key1: undefined"
	// because the key/value pair was removed at first call
	console.log("value for key1:", jxcore.store.get("key1"));


**store.read(key)**

类似store.get，只是不删除<key,value>

	var store = jxcore.store;
	store.set("111", "test");
	
	// the calls below are equivalent:
	var x = store.read("111");
	var y = store.read(111);
	// now x is equal to y

**store.remove(key)**

删除key值和对应的value值

	var store = jxcore.store;
	store.set("111", "test");
	store.remove(111);

**store.set(key, element)**

设置或覆盖<key,element>

	var store = jxcore.store;
	store.set("string", "test");
	// below usages will make automatic conversion of provided keys and values
	// into strings:
	store.set(1, "one");       // equivalent to store.set("1", "one");
	store.set(2, "two");       // equivalent to store.set("2", "two");
	store.set(true, true);     // equivalent to store.set("true", "true");
	store.set(1.45, 2.77);     // equivalent to store.set("1.45", "2.77");

**jxcore.store.shared**

有时候，可能需要在所有sub-instance中共享，就需要一个共享的store，jxcore.store.shared就是这个共享的store，多个sub-instance访问它是线程安全的，store中所有的函数他都有实现，通常用于多线程多个jxcore实例共享数据

**store.shared.expires(key, timeout)**

设置key的超时值，毫秒为单位，当timeout毫秒内没有read、get、set操作该key时，key自动从store中删除

	var mem = jxcore.store.shared;
	mem.set("key", "Hello");
	mem.expires("key", 350);
	
	setTimeout(function(){
	    // the key still exists in the shared store
	    // mem.read("key") will will rewind the timeout counter to the start
	    // so it will expire after another 350 ms
	    console.log("data", mem.read("key"));
	},300);
	
	setTimeout(function(){
	    // right now the timeout is expired
	    // and the key is already removed from the store.
	    // the return value of mem.read("key") will be undefined
	    console.log("data", mem.read("key"));
	},900);

**store.shared.getBlockTimeout()**

当一个key值被safeBlock()锁定后，最大超时值，默认10秒，可以通过setBlockTimeout修改

**store.shared.safeBlock(key, safeBlockFunction, errorCallback)**

key String

safeBlockFunction Function

errorCallback Function

锁定一个key值，当执行safeBlockFunction函数时，锁定key值，主要用于多线程同步某些数据

	jxcore.store.shared.safeBlock("myNumber", function () {
        if (!shared.exists("myNumber")) {
            shared.set("myNumber", 0);
        }

        var n = shared.read("myNumber");
        n = parseInt(n) + 1;
        shared.set("myNumber", n);

        // working with a different key should not be performed in this block:
        shared.set("myNumber_2", 333);
	});

上面的例子中展示了在多线程环境中，安全地增加myNumber变量，
	
	jxcore.store.shared.safeBlock("myNumber",
	    function () {
	        throw "some error";
	    },
	    function(err) {
	        console.log(err);
	    }
	);
**store.shared.setBlockTimeout()**

设置safeBlock函数锁定一个值，最大超时时间

**store.shared.setIfEqualsTo(key, newValue, checkValue)**

key String

newValue String

checkValue String

当key对应的value值为checkValue时，才替换value值为newValue，类似CompareExchange

**store.shared.setIfEqualsToOrNull(key, newValue, checkValue)**

key String

newValue String

checkValue String

value为null或value为checkValue时，才将value替换为newValue

**store.shared.setIfNotExists(key, element)**

key String

newValue String

checkValue String

# Multitasking

jxcore中的Multitasking就是多个线程，每个线程开启一个jxcore instance

**Sub-instances are separated**

每一个jxcore的instance称为sub-instance，每个sub-instance与其他instance完全隔离，他们有各自的V8 context和isolate，instance之间不能共享对象、变量等，但可以通过jxcore.store.shared进行数据交互和共享

process.sendToMain()可以实现sub-instance向main instance(第一个instance)传递消息

V8中，32位系统最大内存为1GB，64位最大内存为1.7GB,在multi-instance环境中，每个task使用独立的V8引擎

**Native C++ Node.JS modules**

**
How to run multitasked code?**

有两种方式让JXCore多线程方式执行js代码

1. 在命令行中指定

> jx mt-keep:4 easy1.js

2. 使用jxcore.tasks


# ModuleInstaller
包管理

jxcore中已经包含了npm管理器
**安装**

	jx install [-g] name_of_the_package[@version] [--autoremove "*.txt,dir1,dir2/file2.txt"]

下载npm包

-g - 全局安装

--autoremove - 执行post task，删除一些特定的文件.比如删除一些代码无关的文件

下面的例子是安装express
> jx install express

使用express

    var express = require("express");
    
安装特定版本的express

	jx install express@3.3.3

使用jxcore内置的npm命令

	jx npm ls
	jx npm version
	jx npm uninstall express
	jx install -ls
	jx install -version
	jx install -uninstall express

# Packaging

JxCore中有一个激动人心的特性，就是可以将源文件和资源文件打包成jx包
将一个工程中大量的文件打包成单个jx包，方便部署，同时也保护我们的js代码不被逆向
执行一个jx包：

	jx helloWorld.jx

打包一个工程

	jx package main_js_file [package_name] [options]

jx递归扫描当前目录下的所有文件，并生成jxp工程文件,main_js_file文件是jx包的启动文件,package_name为包名
假设一个工程中有：helloWorld.js 和 index.html，调用如下命令

	jx package helloWorld.js "HelloWorld"
或

	jx package helloWorld.js --name "HelloWorld"
生成jxp工程文件：HelloWorld.jxp，它用于compile一个工程
**
其他选项**

jx package命令还有如下可选参数：

	--add [ file||folder [, file2||folder2, ... ]]
	--slim file||folder [, file2||folder2, ... ]
	--native
	--show-progress
	--sign


**boolean values**

还有一些开关是bool变量，如果未指定，使用默认值，如果指定了，但没跟具体值，默认为true

	jx package helloWorld.js --extract
	jx package helloWorld.js --extract 0
	jx package helloWorld.js --extract no
	jx package helloWorld.js --extract false
	jx package helloWorld.js --extract 1
	jx package helloWorld.js --extract yes
	jx package helloWorld.js --extract something

**--add选项**

添加额外的文件、目录到jxp包，例如，若只想打包一个文件(例如helloworld.js)，可以用如下两种命令

 > jx package helloWorld.js "HelloWorld" --add

 > jx package helloWorld.js "HelloWorld" --add helloWorld.js

--add和slim组合起来用，可以添加一个目录，但排除子目录，例如：

 > jx package helloWorld.js "HelloWorld" --add node_modules --slim node_modules/express
只打包node_modules目录和helloWorld.js，但排除node_modules/express

**--slim选项**

排除一些目录

**wildcards选项**

可以用通配模式串打包，例如:

> jx package helloWorld.js "HelloWorld" --add "file*.txt"
或:
> jx package helloWorld.js "HelloWorld" --add "file*.txt,*.jpg" --slim "node?modules,dir*"

**绝对路径和相对路径**

例子:

 > jx package helloWorld.js "HelloWorld" --slim out,./out,/users/me/folder/out

**--native选项**

默认false

 > jx package helloWorld.js "HelloWorld" --native
打包为一个独立的自包含的程序，而不是一个包，可以直接运行，而不需要jx，如果在windows系统，直接生成单独的EXE

**--show-progress选项**
进度显示

**--sign选项**

配合**--native**选项使用，用于EXE签名

> jx package helloWorld.js "HelloWorld" --native --sign
内都会调用如下命令

> signtool sign /a HelloWorld.exe

> jx package helloWorld.js "HelloWorld" --native --sign "c:\mycert.pfx"

> jx package helloWorld.js "HelloWorld" --native --sign "/f 'c:\mycert.pfx' /p password"

**compile选项**
当生成了jxp工程文件后，可以用**compile**命令编译生成jx包文件

> jx compile project_file.jxp -native

**JX package**

jx包文件，是将你的工程文件compile生成的二进制文件，它包含了所有的js、资源文件，可以被jx.exe直接调用运行，也可以被其他js通过**require**方式包含执行
如下命令执行一个jx包

> jx my_project.jx
多线程方式执行jx包

> jx mt my_project.jx

> jx mt-keep my_project.jx

require方式执行
> var module = require("./package.jx");

**jxp工程文件**
它包含了整个js工程的描述信息，所包含的文件和资源，要生成jx工程文件，需要先乘胜jxp文件

jxp文件一般结构如下：
```js
{
    "name": "HelloWorld",
    "version": "1.0",
    "author": "",
    "description": "",
    "company": "",
    "copyright": "",
    "website" : "",
    "package": null,
    "startup": "helloWorld.js",
    "execute": null,
    "extract": {
        "what" :  "*.node,*.txt",
        "where" : "my_folder",
        "message" : "Extracting now...",
        "verbose" : true,
        "overwrite" : true
    },
    "output": "helloWorld.jx",
    "files": [
        "helloWorld.js"
    ],
    "assets": [
        "index.html"
    ],
    "library": false,
    "license_file": null,
    "readme_file": null,
    "preInstall" : [
        "mkdir new_folder"
    ],
    "fs_reach_sources": true,
    "native" : true,
    "sign" : ""
}
```
jx包中js可以动态访问jx包对应的jxp文件信息

	var obj = exports.$JXP;
	var name = obj.name;

jx文件中的静态资源文件访问

	readFile()
	readFileSync()
	readdir()
	readdirSync()
这些函数先访问真实的文件系统，用于获取文件，若真实文件不存在，才查询jx包中的文件