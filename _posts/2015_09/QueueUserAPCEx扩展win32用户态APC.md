title: QueueUserAPCEx扩展win32用户态APC
date: 2015-09-04 22:19:36
updated: 2015-09-04 22:19:40
tags:
- windows
- apc
- dll注入

layout:
comments:
categories:
permalink:

---

有一种DLL注入方式为：writeprocessmemory+QueueUserAPC，但是QueueUserAPC函数有个限制，就是目标线程在alert状态时，才能执行APC函数，QueueUserAPCEx是QueueUserAPC的扩展，用于解决QueueUserAPC存在的问题。

windows有一种异步调用机制(APC),一个APC对象就是一个内核控制对象，用于代表一个异步过程调用，APC只在目标线程上下文中执行，APC有三种类型：用户APC、正常内核APC，特殊内核APC，默认情况下，用户APC默认被禁止，所有的用户APC对象都先排队到目标线程，而不是马上执行，当线程进入alert状态时(SleepEx, SignalObjectAndWait, WaitForSingleObjectEx, WaitForMultipleObjectEx, or MsgWaitForMultipleObjectsEx)，才执行APC

```C++
DWORD QueueUserAPCEx(PAPCFUNC pfnApc, HANDLE hThread, DWORD dwData)
```
QueueUserAPCEx不需要目标线程在alert状态，只要目标线程从内核态返回用户态前，都会执行APC函数，从而实现真正的APC，它跟linux下的signal函数触发机制一样

http://www.codeproject.com/Articles/4250/WebControls/

