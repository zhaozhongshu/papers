title: minifilter文件过滤驱动
date: 2015-07-12 19:27:37
updated: 2015-07-12 19:28:13
tags:
- windows
- 驱动

layout:    
comments:
categories:
permalink:
---

```C++
NTSTATUS
  FltRegisterFilter(
    IN PDRIVER_OBJECT  Driver,
    IN CONST FLT_REGISTRATION  *Registration,
    OUT PFLT_FILTER  *RetFilter
    ); 
```
每个minifilter驱动都要调用它向系统注册minifilter drivers，并向系统提供一组回调函数(Registration),函数返回RetFilter指针。

```C++
NTSTATUS
  FltStartFiltering(
    IN PFLT_FILTER  Filter
    ); 
```
激活filter,所有变量、状态都初始化OK后才调用。
```C++
VOID
  FltUnregisterFilter(
    IN PFLT_FILTER  Filter
    ); 

```
反注册filter

注册minifilter驱动最主要就是先填写FLT_REGISTRATION结构体
```C++
typedef struct _FLT_REGISTRATION {
  //结构体大小: sizeof(FLT_REGISTRATION)
  USHORT  Size;
  //版本号:FLT_REGISTRATION_VERSION
  USHORT  Version;
  FLT_REGISTRATION_FLAGS  Flags;

  //一组FLT_CONTEXT_REGISTRATION结构体 以{FLT_CONTEXT_END}为结束
  //应该是定义每一种type的callback对应的context大小、分配函数、释放函数、初始化等
  //系统通过注册的context size、tag等信息来调用FltAllocateContext创建一个新的context。
  CONST FLT_CONTEXT_REGISTRATION  *ContextRegistration;
  
  //一组pre/post operation回调函数
  CONST FLT_OPERATION_REGISTRATION  *OperationRegistration;

  //卸载回调函数
  PFLT_FILTER_UNLOAD_CALLBACK  FilterUnloadCallback;

  //绑定新的卷设备
  PFLT_INSTANCE_SETUP_CALLBACK  InstanceSetupCallback;

  //卷设备卸载相关回调
  PFLT_INSTANCE_QUERY_TEARDOWN_CALLBACK  InstanceQueryTeardownCallback;
  PFLT_INSTANCE_TEARDOWN_CALLBACK  InstanceTeardownStartCallback;
  PFLT_INSTANCE_TEARDOWN_CALLBACK  InstanceTeardownCompleteCallback;

  PFLT_GENERATE_FILE_NAME  GenerateFileNameCallback;
  PFLT_NORMALIZE_NAME_COMPONENT  NormalizeNameComponentCallback;
  PFLT_NORMALIZE_CONTEXT_CLEANUP  NormalizeContextCleanupCallback;
#if FLT_MGR_LONGHORN
  PFLT_TRANSACTION_NOTIFICATION_CALLBACK TransactionNotificationCallback;
  PFLT_NORMALIZE_NAME_COMPONENT_EX  NormalizeNameComponentExCallback;
#endif // FLT_MGR_LONGHORN
} FLT_REGISTRATION, *PFLT_REGISTRATION;
```

FLT_CONTEXT_REGISTRATION结构定义如下：
```C++
typedef struct _FLT_CONTEXT_REGISTRATION {

  //context类型:FLT_VOLUME_CONTEXT、FLT_INSTANCE_CONTEXT、FLT_STREAMHANDLE_CONTEXT等
  FLT_CONTEXT_TYPE  ContextType;

  FLT_CONTEXT_REGISTRATION_FLAGS  Flags;
  
  //类似context对象的析构函数(可为空)
  PFLT_CONTEXT_CLEANUP_CALLBACK  ContextCleanupCallback;

  //context大小
  SIZE_T  Size;

  //tag值(系统会帮我们分配context对象)
  ULONG  PoolTag;

  //自定义alloc、free函数(可为空)
  PFLT_CONTEXT_ALLOCATE_CALLBACK  ContextAllocateCallback;
  PFLT_CONTEXT_FREE_CALLBACK  ContextFreeCallback;
  PVOID  Reserved1;
} FLT_CONTEXT_REGISTRATION;
```

函数FltAllocateContext/FltReleaseContext也是用来分配context的(这不和FLT_CONTEXT_REGISTRATION结构冗余了吗？)
```C++
NTSTATUS
  FltAllocateContext(
    IN PFLT_FILTER  Filter,
    IN FLT_CONTEXT_TYPE  ContextType,
    IN SIZE_T  ContextSize,
    IN POOL_TYPE  PoolType,
    OUT PFLT_CONTEXT  *ReturnedContext
    );

VOID
  FltReleaseContext(
    IN PFLT_CONTEXT  Context
    ); 
```

FLT_OPERATION_REGISTRATION结构体定义:
```C++
typedef struct _FLT_OPERATION_REGISTRATION {
  
  //同IRP中的major function 
  UCHAR  MajorFunction;
  
  //page io是否skip 、 cache i是否skip
  FLT_OPERATION_REGISTRATION_FLAGS  Flags;

  //pre/post回调函数 可为空
  PFLT_PRE_OPERATION_CALLBACK  PreOperation;
  PFLT_POST_OPERATION_CALLBACK  PostOperation;
  PVOID  Reserved1;
} FLT_OPERATION_REGISTRATION

FLT_PREOP_CALLBACK_STATUS pre_callback(
    IN OUT PFLT_CALLBACK_DATA Data,
    IN PCFLT_RELATED_OBJECTS FltObjects,
    OUT PVOID *CompletionContext
    );
```
**pre_callback可以返回如下几种值：**
FLT_PREOP_SUCCESS_WITH_CALLBACK：成功并告诉系统，需要回调post_callback函数
FLT_PREOP_SUCCESS_NO_CALLBACK：成功并告诉系统，不要回调post_callback函数
FLT_PREOP_PENDING:告诉系统需要pending这个操作，直到FltCompletePendedPreOperation调用后，系统才继续处理这个操作
FLT_PREOP_DISALLOW_FASTIO:告诉系统禁用fastio
FLT_PREOP_COMPLETE,
FLT_PREOP_SYNCHRONIZE：告诉系统，需要在pre_callback相同线程中调用post_callback,IRQL <= APC_LEVEL
```C++
FLT_POSTOP_CALLBACK_STATUS post_callback(
    __inout PFLT_CALLBACK_DATA Data,
    __in PCFLT_RELATED_OBJECTS FltObjects,
    __in_opt PVOID CompletionContext,
    __in FLT_POST_OPERATION_FLAGS Flags
    );
```
**post_callback可以返回如下几个值:**
FLT_POSTOP_FINISHED_PROCESSING:port驱动已完成，系统可以继续完成IO请求
FLT_POSTOP_MORE_PROCESSING_REQUIRED：告诉系统暂停处理IO请求，FltCompletePendedPostOperation告诉系统可以继续了。当miniport驱动需要做一些耗时处理时，可以返回这个值（只有基于IRP的io请求才支持）。

#一个miniport驱动案例
