title: minifilter communication port通信模型
date: 2015-07-18 20:46:29
updated: 2015-07-18 20:50:04
tags:
- windows
- 驱动
- asio

layout:    
comments:
categories:
permalink:
---

minifilter port通信模型是在minifilter驱动中引入的，用于高效的ring0、ring3通信，但它不限于minifilter中使用。

#minifilter port提供的API函数
***驱动中的API函数***
```C++
NTSTATUS FltCreateCommunicationPort(
    IN PFLT_FILTER  Filter,
    OUT PFLT_PORT  *ServerPort,
    IN POBJECT_ATTRIBUTES  ObjectAttributes,
    IN PVOID  ServerPortCookie OPTIONAL,
    IN PFLT_CONNECT_NOTIFY  ConnectNotifyCallback,
    IN PFLT_DISCONNECT_NOTIFY  DisconnectNotifyCallback,
    IN PFLT_MESSAGE_NOTIFY  MessageNotifyCallback,
    IN LONG  MaxConnections
    );

用于创建一个port服务端，服务端需要提供 on_connect, on_disconnect, on_message回调函数

VOID FltCloseCommunicationPort(
    __in PFLT_PORT  ServerPort
    ); 
关闭port服务端

VOID FltCloseClientPort(
    __in PFLT_FILTER  Filter,
    __deref_out PFLT_PORT  *ClientPort
    ); 
关闭一个connection实例

NTSTATUS FltSendMessage(
    __in PFLT_FILTER  Filter,
    __in PFLT_PORT  *ClientPort,
    __in PVOID  SenderBuffer,
    __in ULONG  SenderBufferLength,
    __out_opt PVOID  ReplyBuffer OPTIONAL,
    __inout_opt PULONG  ReplyLength 
    __in_opt PLARGE_INTEGER  Timeout 
    ); 
驱动主动向ring3发送消息
这个函数有两种使用方法：

1.请求+响应
指定reply buffer，用于接收ring3消息处理结果
Timeout设置比较大的值
等待ring3接收消息(ring3调用FilterGetMessage)
等待ring3返回消息结果(FilterReplyMessage)

一般用于驱动在任意线程上下文中上抛：文件监控、注册表监控等，会导致调用线程hang


2.仅请求
reply buffer为NULL
Timeout设置比较大的值
等待ring3接收消息(ring3调用FilterGetMessage)

一般用于驱动发送给ring3一些通知消息，例如：不需要ring3返回结果
也可用于驱动不需要马上得到结果的场景，ring3可以通过FilterSendMessage发送结果消息
在驱动的on_message函数中处理消息结果
```

**应用层的API函数**
```C++
HRESULT
WINAPI
  FilterConnectCommunicationPort(
    IN LPCWSTR  lpPortName,
    IN DWORD  dwOptions,
    IN LPVOID  lpContext OPTIONAL,
    IN DWORD  dwSizeOfContext,
    IN LPSECURITY_ATTRIBUTES  lpSecurityAttributes OPTIONAL,
    OUT HANDLE  *hPort
    ); 
连接port服务端，建立连接后返回一个connection句柄

HRESULT
WINAPI
  FilterGetMessage(
    IN HANDLE  hPort,
    IN OUT PFILTER_MESSAGE_HEADER  lpMessageBuffer,
    IN DWORD  dwMessageBufferSize,
    IN LPOVERLAPPED  lpOverlapped OPTIONAL
    ); 
获取ring0发送的消息


HRESULT
WINAPI
  FilterReplyMessage(
    __in HANDLE  hPort,
    __in PFILTER_REPLY_HEADER  lpReplyBuffer,
    __in DWORD  dwReplyBufferSize
    ); 
返回某个消息处理结果

HRESULT
WINAPI
  FilterSendMessage(
    __in HANDLE  hPort,
    __in_bcount LPVOID  lpInBuffer,
    __in DWORD  dwInBufferSize,
    __out_bcount_part_opt LPVOID  lpOutBuffer,
    __in DWORD  dwOutBufferSize,
    __out LPDWORD  lpBytesReturned
    ); 
应用层主动给ring0发送消息请求
```

#应用层主动调用驱动功能
驱动在caller线程上下文中执行
传统方式方式：使用DeviceIoControl跟驱动通信。
```C++
应用层
HANDLE hConnect = NULL;
FilterConnectCommunicationPort(...,&hConnect);
FilterSendMessage(hConnect, send_buffer, recv_buffer,...); 

驱动层MessageNotifyCallback回调函数
NTSTATUS OnMessageRequest(
      IN PVOID PortCookie,
      IN PVOID InputBuffer OPTIONAL,
      IN ULONG InputBufferLength,
      OUT PVOID OutputBuffer OPTIONAL,
      IN ULONG OutputBufferLength,
      OUT PULONG ReturnOutputBufferLength
      )
{
    ...
}
```

#驱动同步调用应用层
驱动在任意线程上下文中调用FltSendMessage，等待应用层返回处理结果
```C++
应用层
while(1)
{
    FilterGetMessage(...);  //获取ring0调用
    handle_message();       //处理消息(可以放在单独线程中处理)
    FilterReplyMessage();   //回复结果(可以放在单独线程中处理)
}

驱动层
FltSendMessage(...);
```

#驱动异步调用应用层
驱动在任意上下文中调用FltSendMessage，只需等待消息提交成功，不用等待FilterReplyMessage

#应用层flt与asio结合
由于FilterGetMessage支持IOCP，所有可以使用asio管理消息接收 