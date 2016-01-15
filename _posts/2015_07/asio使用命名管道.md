title: asio使用命名管道
date: 2015-07-08 17:56:43
updated: 2015-07-08 19:01:09
tags:
- asio
- C++
- windows
- 网络

layout:
comments:
categories:
permalink:

---

* **[客户端](#命名管道客户端)**
* **[服务端](#命名管道服务端)**

windows平台下，基于命名管道的通信方式使用非常普遍，它相比socket更加高效。命名管道支持IOCP模型，所以可以通过asio框架使管道通信异步化。

#1.命名管道客户端
命名管道client是比较简单的，其基本流程就是：
```C++
 hPipe = CreateFile(...);   //连接管道
 if( ERROR_PIPE_BUSY ){     //防止管道忙的问题
    WaitNamedPipe(...);
    //retry again
 }
 ReadFile/WriteFile...      //读写数据
 ...
 CloseHandle();             //关闭管道
```

在asio中为了不阻塞线程， 我们要把WaitNamedPipe替换成**定时器+轮询方式**
其余就跟文件IO一样了
```C++
asio::windows::stream_handle asio_handle;
hPipe = CreateFile(...);
 if( ERROR_PIPE_BUSY ){     //防止管道忙的问题
    trigger timeout handler;//retry CreateFile
 }
 else{
    asio_handle.assgin(hPipe);

    async_read/async_write/...
    ...
 }
```

#2. 命名管道服务端
命名管道服务端主要用CreateNamedPipeA创建管道实例，ConnectNamedPipe等待客户端连接。代码如下:
```C++
typedef asio::windows::stream_handle pipe_handle;
template <typename Handler>
void async_accept(pipe_handle& peer, ASIO_MOVE_ARG(Handler) handler)
{
    error_code err;
    asio::windows::overlapped_ptr op(peer.get_io_service(), handler);
    //打开新实例
    HANDLE hInstance = CreateNamedPipeA(
        address.c_str(),
        PIPE_ACCESS_DUPLEX|FILE_FLAG_OVERLAPPED,
        PIPE_TYPE_BYTE|PIPE_READMODE_BYTE,
        PIPE_UNLIMITED_INSTANCES,
        4096, 4096, 0, NULL);
    //与asio framework关联
    peer.assign(hInstance, err);

    //提交等待client连接
    BOOL success = ::ConnectNamedPipe(hInstance, op.get());
    DWORD last_error = ::GetLastError();
    if( success || last_error == ERROR_PIPE_CONNECTED ) //连接成功?
    {
        op.complete(err, 0);
    }
    else if( last_error == ERROR_IO_PENDING )   //等待完成
    {
        op.release();
    }
    else    //发生错误?
    {
        op.complete(error_code(last_error, asio::error::get_system_category()), 0);
    }
}
```
