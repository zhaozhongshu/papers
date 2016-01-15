title: windows下内核对象过滤新方法
date: 2015-07-13 16:16:54
updated: 2015-07-13 16:18:37
tags:
- windows
- 驱动

layout:    
comments:
categories:
permalink:
---

ObRegisterCallbacks是vista以后新增的内核函数
内核对象创建、复制对象时，
OB_OPERATION_HANDLE_CREATE
OB_OPERATION_HANDLE_DUPLICATE
指定两个回调函数pre_callback、post_callback
在pre_callback回调函数中，可以对创建、复制参数做一些必要的修改：
```C++
OB_PREOP_CALLBACK_STATUS pre_callback(IN PVOID  RegistrationContext,IN POB_PRE_OPERATION_INFORMATION  opinfo);
```

要知道pre回调中到底能干些什么，需要了解OB_PRE_OPERATION_INFORMATION结构体为我们提供了什么信息
```C++
typedef struct _OB_PRE_OPERATION_INFORMATION {
  __in OB_OPERATION  Operation; //操作类型:OB_OPERATION_HANDLE_CREATE /OB_OPERATION_HANDLE_DUPLICATE
  union {
    __in ULONG  Flags;
    struct {
      __in ULONG  KernelHandle:1;   
      __in ULONG  Reserved:31;
    };
  };
  __in PVOID  Object;           //目标对象
  __in POBJECT_TYPE  ObjectType;//对象类型
  __out PVOID  CallContext;     //pre、post回调之间传递参数用
  __in POB_PRE_OPERATION_PARAMETERS  Parameters;    //关键参数
}


typedef struct _OB_PRE_CREATE_HANDLE_INFORMATION {
    __inout ACCESS_MASK         DesiredAccess;
    __in ACCESS_MASK            OriginalDesiredAccess;
} OB_PRE_CREATE_HANDLE_INFORMATION, *POB_PRE_CREATE_HANDLE_INFORMATION;

typedef struct _OB_PRE_DUPLICATE_HANDLE_INFORMATION {
    __inout ACCESS_MASK         DesiredAccess;
    __in ACCESS_MASK            OriginalDesiredAccess;
    __in PVOID                  SourceProcess;
    __in PVOID                  TargetProcess;
} OB_PRE_DUPLICATE_HANDLE_INFORMATION, * POB_PRE_DUPLICATE_HANDLE_INFORMATION;

typedef union _OB_PRE_OPERATION_PARAMETERS {
    __inout OB_PRE_CREATE_HANDLE_INFORMATION        CreateHandleInformation;
    __inout OB_PRE_DUPLICATE_HANDLE_INFORMATION     DuplicateHandleInformation;
} OB_PRE_OPERATION_PARAMETERS, *POB_PRE_OPERATION_PARAMETERS;
```
**对于CREATE内核对象，我们可以修改它的权限**
**对于DUPLICATE内核对象，我们可以获取源进程、目标进程以及权限，同时也可以修改其权限**
**我们还可以根据对象指针，拿到对象的具体信息**

```C++
VOID post_callback(
  IN PVOID  RegistrationContext,
  IN POB_POST_OPERATION_INFORMATION  OperationInformation
  );
```
**post_callback中只能用于接收数据，不能修改，可用于一些内核句柄的侦听**

#使用ObRegisterCallbacks有几大限制

1.**只支持Vista以后**，如果产品要考虑XP的化，就比较蛋疼，得单独为XP维护一套逻辑
2.文档中描述，只支持PsProcessType、PsThreadType两种类型
    不过这个限制可以突破，把其对象类型的OBJECT_TYPE:SupportsObjectCallbacks改为1就可以
    我测试过IoFileObjectType是可以过滤的,一般用来实现自保护