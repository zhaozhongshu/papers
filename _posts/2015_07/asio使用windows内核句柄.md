title: asio使用windows内核句柄
date: 2015-07-06 17:54:00
updated: 2015-07-06 19:05:36
tags:
- asio
- C++
- windows

layout:
comments:
categories:
permalink:

---

* **[Serial Ports](#Serial Ports)**
* **[Stream-Oriented HANDLEs](#Stream-Oriented HANDLEs)**
* **[Random-Access HANDLEs](#Random-Access HANDLEs)**
* **[other Object HANDLEs](#other Object HANDLEs)**
* **[Timers](#Timers)**

#1.Serial Ports
在PC机上，读写串口还是比较常见的，可以通过asio库,让串口读写异步化

```C++
serial_port myPort(my_io_service, L"COM1"); //linux下/dev/ttyS0
```
然后，myPort就可以像socket等stream object一样，供async_read/async_write模板函数使用了。

#2.Stream-Oriented HANDLEs
windows上有一些流句柄类型，如：命名管道、文件等，可以通过asio::windows::stream_handle进行异步读写。
```C++
HANDLE handle = ::CreateFile(...);
windows::stream_handle obj(my_io_service, handle);
```
然后可以通过read(), async_read(), write(), async_write(), read_until() or async_read_until()等函数操作obj对象。
注意：对应的内核句柄必须支持IOCP（命名管道支持IOCP，但匿名管道不支持，所以，匿名管道不支持asio）。

#3.Random-Access HANDLEs
可以使用asio::windows::random_access_handle对文件句柄进行异步随机读写。
```C++
HANDLE handle = ::CreateFile(...);
windows::random_access_handle obj(my_io_service, handle);
```

支持随机读写的句柄一般都是文件对象。可以使用read_some_at(), async_read_some_at(), write_some_at() or async_write_some_at(),read_at(), async_read_at(), write_at() and async_write_at()等函数对obj文件随机读写。

#4.other Object HANDLEs
除了命名管道、文件、串口，asio还支持windows中其他几种内核句柄，如：
Change notification
Console input
Event
Memory resource notification
Process
Semaphore
Thread
Waitable timer

```C++
static void on_event(HANDLE hEvent,error_code err)
{
    CloseHandle(hEvent);
}

HANDLE hEvent = ::CreateEvent(0, 0, TRUE, NULL);
asio::windows::object_handle obj(*svc, hEvent);
obj.async_wait(boost::bind(on_event, hEvent, _1));
```
async_wait、wait成员函数都可以调用。
async_wait成员函数内部其实是通过调用RegisterWaitForSingleObject来实现的。
有一组系统线程池，通过WaitForMultipleObject侦听一组内核句柄状态。

#5. Timers
asio中定时触发某个任务：
```C++
static void on_timeout(error_code err)
{
    TODO("定时器超时处理");
}

asio::deadline_timer tn(*svc, boost::posix_time::seconds(5));
tn.async_wait(boost::bind(on_timeout, _1));
```
定时器有如下这些精度：
>boost::posix_time::milliseconds
>boost::posix_time::seconds
>boost::posix_time::minutes
>boost::posix_time::hours