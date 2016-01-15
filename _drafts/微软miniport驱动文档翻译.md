title: 微软miniport驱动文档翻译
date: 2015-07-12 20:50:02
updated: 2015-07-12 20:50:17
tags:
- windows
- 驱动

layout:    
comments:
categories:
permalink:

---
#微软miniport驱动原始文档地址
[http://download.microsoft.com/download/e/b/a/eba1050f-a31d-436b-9281-92cdfeae4b45/FilterDriverDeveloperGuide.doc](http://download.microsoft.com/download/e/b/a/eba1050f-a31d-436b-9281-92cdfeae4b45/FilterDriverDeveloperGuide.doc)


#1.概述
本文所述适用于本地、网络文件系统与IO管理器之间的过滤驱动。对于文件系统与磁盘驱动之间的过滤驱动并不适用。例如FtDisk、DMIO。
我们将讲述一种新的文件系统过滤驱动：minifilter
legacy filters是指：基于IRP、设备过滤的文件系统过滤驱动。
minifilter驱动中，minifilter管理器是以legacy filter实现的，并内置到windows系统中
minifilter框架相比传统框架，有如下优势：
•   简单、稳定、开发难度低.
•   支持动态加载卸载、attach、detach.
•   在设备栈中绑定到合适的位置.
•   上下文管理：高效、清晰、稳定的上下文管理，用于file object、streams、files、instances、volumes.
•   A host of utility routines including support for looking up names and caching them for efficient access, communication between minifilters and user mode services, and IO queuing.
•   Support non-recursive I/O so minifilter generated I/O can easily be seen only by lower minifilters and the file system.
•   Filter only operations of interest to minifilter – unlike the legacy model where a filter has to hook every entry point to pass through operation.

#2.术语
Filter: 文件系统过滤驱动
Volume: 本地文件系统中的volume
Instance: filter驱动在一个卷设备上的instance. 同一个卷设备上可以有多个instance.例如：FileSpy
Stream: 一个文件中的stream
FileObject: .
CallbackData:  包含一次operation的所有相关信息，类似一个IRP.

#3.Minifilter Installation
CreateService创建驱动时，DependOnService设置为FltMgr
设置一组注册表值
SYSTEM\\CurrentControlSet\\Services\\Instance下
DefaultInstance：SYSTEM\\CurrentControlSet\\Services\\Instance
Altitude
Flags

#4. Minifilter Registration
DriverEntry函数中调用FltRegisterFilter

#5. Initiating filtering
调用FltStartFiltering

#6. Instance Notification Support
A set of callbacks are provided to notify a minifilter when an instance is being created or torn down.  Through these callbacks, the minifilter can control when instances are attached and detached from volumes.






