title: asio使用ReadDirectoryChangesW监控目录
date: 2015-07-08 17:48:00
updated: 2015-07-08 17:48:27
tags:
- asio
- C++
- windows

layout:
comments:
categories:
permalink:

---

* **[ReadDirectoryChangesW](#ReadDirectoryChangesW)**

如前文中所属，任何支持IOCP的操作，都可以用asio包装。ReadDirectoryChangesW就是如此。

#ReadDirectoryChangesW

监控目录变化
由于ReadDirectoryChangesW调用可以通过GetQueuedCompletionStatus异步获取结果
```C++
typedef asio::detail::io_service_impl   asio_svc_impl;
//以FILE_FLAG_OVERLAPPED方式打开目录
HANDLE handle = CreateFileA(dir.c_str(), 
            FILE_LIST_DIRECTORY,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, 
            NULL,
            OPEN_EXISTING, 
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, 
            NULL);

asio_svc_impl &svc_impl = asio::use_service<asio_svc_impl>(svc);
svc_impl.register_handle(handle);

//提交request
asio::windows::overlapped_ptr op(svc, bind(on_dir_change, ctx, _1, _2));
DWORD transferred;
BOOL ok = ReadDirectoryChangesW(
    ctx->handle, 
    ctx->buffer, 
    sizeof(ctx->buffer),
    ctx->subtree, 
    ctx->filter, 
    &transferred, 
    op.get(),
    NULL);
//检查结果
int last_error = GetLastError();
if (!ok && last_error != ERROR_IO_PENDING)
{
    //错误发生时，触发on_dir_change回调
    error_code ec(last_error, asio::error::get_system_category());
    op.complete(ec, 0);
}
else
{
    op.release();
}

void on_dir_change(dir_mon_context* ctx, error_code err, size_t bytes)
{
    //TODO("处理变动")
    //再提交一次ReadDirectoryChangesW ?
}
```
