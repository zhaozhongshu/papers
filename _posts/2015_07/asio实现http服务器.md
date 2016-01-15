title: asio实现http服务器
date: 2015-07-03 18:52:46
updated: 2015-07-03 19:05:36
tags:
- C++
- asio
- 网络

layout:    
comments:
categories:
permalink:

---

#asio基础
asio是一个跨平台的C++网络库，通过它，可以方便的进行异步I/O编程。

##io_service

io_service类是asio库的核心框架类，为以下这些异步IO对象提供支持
`asio::ip::tcp::socket` 
`asio::ip::tcp::acceptor`
`asio::ip::udp::socket`
`asio::deadline_timer`
通过io_service类的run/run_once/poll/poll_once函数，可以让调用线程进入异步IO循环。当有异步IO任务完成时，会在run中调用完成handler函数。
```C++
 asio::io_service io_service;
  ...
  for (;;)
  {
    try
    {
      io_service.run();
      break; // run() exited normally
    }
    catch (my_exception& e)
    {
      // Deal with exception as appropriate.
    }
  }
```
类定义如下
```C++
class io_service : private noncopyable
{
private:
  typedef detail::io_service_impl impl_type;
  friend class detail::win_iocp_overlapped_ptr;
public:
  class work;
  friend class work;
  class id;
  class service;
  class strand;

  //io_service上并发调用run的线程数
  ASIO_DECL explicit io_service(std::size_t concurrency_hint);
  ASIO_DECL ~io_service();

  ASIO_DECL std::size_t run();  //抛异常版本
  ASIO_DECL std::size_t run(asio::error_code& ec);//不抛异常版本

  ASIO_DECL std::size_t run_one();
  ASIO_DECL std::size_t run_one(asio::error_code& ec);

  ASIO_DECL std::size_t poll();
  ASIO_DECL std::size_t poll(asio::error_code& ec);

  ASIO_DECL std::size_t poll_one();
  ASIO_DECL std::size_t poll_one(asio::error_code& ec);

  ASIO_DECL void stop();
  ASIO_DECL bool stopped() const;
  ASIO_DECL void reset();

   //post一个handler到asio，由工作线程执行，等待handler执行完成
  template <typename CompletionHandler>
  ASIO_INITFN_RESULT_TYPE(CompletionHandler, void ())
  dispatch(ASIO_MOVE_ARG(CompletionHandler) handler);

  //post一个handler到asio，由工作线程执行，马上返回
  template <typename CompletionHandler>
  ASIO_INITFN_RESULT_TYPE(CompletionHandler, void ())
  post(ASIO_MOVE_ARG(CompletionHandler) handler);

private:
    detail::winsock_init<> init_;
  // The service registry.
  asio::detail::service_registry* service_registry_;
  // The implementation.
  impl_type& impl_;
};
```

##asio::io_service::work

io_service的辅助类，解决io_service::run函数在没有pending的任务时，就返回的问题
```C++
asio::io_service svc;
asio::io_service::work work(svc);  
asio::error_code err;
svc.run(err);       因为有work对象，run函数没有任务时也不会返回，只有显示svc.stop时才返回
```

#使用asio创建一个基本TCP server

##asio初始化+创建侦听任务

```C++
typedef asio::ip::tcp::socket       tcp_socket;
typedef asio::ip::tcp::acceptor     tcp_acceptor;
typedef asio::ip::tcp::endpoint     tcp_endpoint;

//TCP连接上下文
struct CONNECTION
{
    tcp_socket  sock;
    char        recv_buf[1500];
    CONNECTION(asio::io_service& io_service):sock(io_service)
    {
    }
};

asio::io_service* svc = NULL;
tcp_acceptor*  acceptor = NULL;
bool init()
{
    //创建io_service
    svc = new asio::io_service;
    acceptor = new tcp_acceptor(*svc);
    tcp_endpoint address =tcp_endpoint(ip::address_v4::from_string("127.0.0.1", 80);    
    error_code err;
    acceptor->open(address.protocol(),err);
    acceptor->set_option(tcp_acceptor::reuse_address(true), err);//端口复用
    acceptor->bind(address, err);
    acceptor->listen(64, err);

    do_accept();
    return true;
}
```

##提交异步accept请求
```C++
void do_accept(void)
{
    CONNECTION* cnn = new CONNECTION(*svc);
    acceptor->async_accept(cnn->sock, boost::bind(on_accept, cnn, _1));
}
```

##异步accept完成回调
```C++
void on_accept(CONNECTION* cnn, error_code err)
{
    if( err )   //accept错误? 一般没发现过
    {
        error_code err1;
        cnn->sock.shutdown(asio::socket_base::shutdown_both, err1);
        delete cnn;
    }
    else //accept连接成功 接收数据
    {
        cnn->sock.async_read_some(asio::buffer((void*)cnn->recv_buf, sizeof(cnn->recv_buf)),bind(on_recv, cnn, _1, _2));
    }

    do_accept(); //提交下一个accept请求
}
```

##处理client端发送过来的数据
```C++
void on_recv(CONNECTION* cnn, error_code err, size_t bytes)
{
    if( err )   //recv错误? 
    {
        error_code err1;
        cnn->sock.shutdown(asio::socket_base::shutdown_both, err1);
        delete cnn;
        return;
    }
    
    //TODO("解析读取到的数据");

    //需要向client发送数据时
    asio::async_write(cnn->sock, asio::buffer((void*)buf->buffer, buf->len), bind(on_send, cnn, buf, _1, _2));  
}
```

##进入异步asio循环
```C++
void start_loop()
{
    asio::io_service::work work(*svc);  
    asio::error_code err;
    svc->run(err);
    return 0;
}
```


至此，一个基本的TCP server已经成型了，http server也是一个TCP服务器，只不过在其基础上增加了HTTP协议。HTTP协议解析不需要我们自己实现了，因为现在开源HTTP协议解析库一大堆，这里我选择[http_parser](https://github.com/joyent/http-parser)协议库,为什么选择http_parser，是因为它相当轻量级，功能完善，它一个解析上下文不到50字节，内部使用状态机模型，解决了组包解析等问题。大名鼎鼎的Node.js就是使用它做http协议解析。

##http_parser使用 

首先需要填充http_parser_settings结构体，主要是为了向http_parser传入一组回调函数
```C++

typedef int (*http_data_cb) (http_parser*, const char *at, size_t length);
typedef int (*http_cb) (http_parser*);

struct http_parser_settings {
  http_cb      on_message_begin;    //http消息开始回调
  http_data_cb on_url;              //接收url
  http_data_cb on_status;           //接收状态码
  http_data_cb on_header_field;     //接收HTTP头key
  http_data_cb on_header_value;     //接收HTTP头value
  http_cb      on_headers_complete; //header结束
  http_data_cb on_body;             //body数据
  http_cb      on_message_complete; //http消息结束
};

```
我们在init函数中添加如下代码
```c++
    g_Options.on_body               = on_req_body;
    g_Options.on_header_field       = on_req_header_filed;
    g_Options.on_header_value       = on_req_header_value;
    g_Options.on_headers_complete   = on_req_header_complete;
    g_Options.on_message_begin      = on_req_message_begin;
    g_Options.on_message_complete   = on_req_message_complete;
    g_Options.on_url                = on_req_url;
    g_Options.on_status             = NULL;
```

http_parser结构体是http解析时的上下文

我们向CONNECTION结构体添加http_parser状态
```C++
struct CONNECTION
{
    tcp_socket  sock;
    http_parser parser;         //HTTP协议解析上下文
    string      uri;            //保存client请求的URI
    char        recv_buf[1500];
    CONNECTION(asio::io_service& io_service):sock(io_service)
    {
        http_parser_init(&parser, HTTP_REQUEST);    //初始化parser
    }
};
```

在on_recv函数中，我们增加http_parser对接收数据的处理
```C++
void on_recv(CONNECTION* cnn, error_code err, size_t bytes)
{
    if( err )   //recv错误? 
    {
        error_code err1;
        cnn->sock.shutdown(asio::socket_base::shutdown_both, err1);
        delete cnn;
        return;
    }
    
    //调用http_parser解析recv buffer
    int tmpparsed = http_parser_execute(&cnn->parser, &g_Options, cnn->recv_buf, bytes);
    //不支持upgrade/非HTTP协议
    if (cnn->parser.upgrade || bytes != tmpparsed) 
    {
        error_code err1;
        cnn->sock.shutdown(asio::socket_base::shutdown_both, err1);
        delete cnn;
        return;
    } 
    else
    //继续post read请求，从client端读取数据
    {
        cnn->sock.async_read_some(asio::buffer((void*)cnn->recv_buf, sizeof(cnn->recv_buf)),bind(on_recv, cnn, _1, _2));
    }
}
```

http_parser_execute传入cnn->parser(解析上下文)、g_Options(一组回调函数), recv_buf+bytes(接收缓冲区)

在on_req_url回调函数中,保存request uri
```C++
static int on_req_url(http_parser* parser, const char *at, size_t length)
{
    CONNECTION* cnn = CONTAINING_RECORD(parser ,CONNECTION, parser);
    cnn->uri.append(at, length);
    return 0;
}
```

当on_req_message_complete回调函数被调用时，说明已经接收到一个完整的http请求了，可以处理这个request了.
```C++
static int on_req_message_complete(http_parser* parser)
{
    CONNECTION* cnn = CONTAINING_RECORD(parser ,CONNECTION, parser);
    on_new_request(cnn);
    return 0;
}
```

on_new_request决定服务器应该相应client端什么内容
```C++
void on_new_request(CONNECTION* cnn)
{
    transform(cnn->uri.begin(), cnn->uri.end(), cnn->uri.begin(), tolower);

    static char szHelloMessage[] = 
        "HTTP/1.1 200 OK\r\n"
        "Connection: keep-alive\r\n"
        "Server: uxfork\r\n"
        "Content-Length: 18\r\n"
        "\r\n"
        "hello http server!";
    
    asio::async_write(cnn->sock, asio::buffer((void*)szHelloMessage, strlen(szHelloMessage)), bind(on_send, cnn, buf, _1, _2));  
}
```


一个精简的http服务器就完成了，是不是很简单？ 使用asio库，可以同时处理大量TCP连接，简单高效。