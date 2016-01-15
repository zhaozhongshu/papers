title: Different ways of handling IRPs
date: 2015-08-06 09:40:31
updated: 2015-08-06 09:40:35
tags:
- 驱动
- windows

layout:
comments:
categories:
permalink:

---

* **[Introduction](#Introduction)**
* **[Forward and forget](#Forward and forget)**
* **[Forward and wait](#Forward and wait)**
* **[Forward with a completion routine](#Forward with a completion routine)**
* **[Queue for later, or forward and reuse](#Queue for later, or forward and reuse)**
* **[Complete the IRP in the dispatch routine](#Complete the IRP in the dispatch routine)**

# **Introduction**

WDM驱动最频繁的任务就是从一个驱动向另一个驱动发送IRP请求，要么创建自己的IRP发给下层驱动，要么forward另一个驱动发来的IRP给下层驱动
本文主要列举出所有IRP传递方式。

前5个例子描述在IRP Dispatch routine中如何forward IRP给另一个驱动
后7个例子描述create IRP and send IRP的各种方式
在看这些例子前，先了解一下completion routine中返回的几个状态码含义：

**STATUS_MORE_PROCESSING_REQUIRED** ：IO管理器检测到这个标记时，会 stop completing the IRP，leave the stack location unchanged and return。主要防止IRP被释放，我们必须在其他地方调用IoCompleteRequest继续完成这个IRP。
**非STATUS_MORE_PROCESSING_REQUIRED**：IO管理器会向上继续completing the IRP
DDK中的定义：
```C++
// 
// This value should be returned from completion routines to continue
// completing the IRP upwards. Otherwise, STATUS_MORE_PROCESSING_REQUIRED
// should be returned.
// 
#define STATUS_CONTINUE_COMPLETION      STATUS_SUCCESS
// 
// Completion routines can also use this enumeration instead of status codes.
// 
typedef enum _IO_COMPLETION_ROUTINE_RESULT {
    
    ContinueCompletion = STATUS_CONTINUE_COMPLETION,
    StopCompletion = STATUS_MORE_PROCESSING_REQUIRED

} IO_COMPLETION_ROUTINE_RESULT, *PIO_COMPLETION_ROUTINE_RESULT;
```

# **场景1：Forward and forget**
驱动forward IRP到下层，不做其他处理，不需要设置completion routine

```C++
NTSTATUS
DispatchRoutine_1(
    IN PDEVICE_OBJECT DeviceObject,
    IN PIRP Irp
    )
{
    // 
    // You are not setting a completion routine, so just skip the stack
    // location because it provides better performance.
    // 
    IoSkipCurrentIrpStackLocation (Irp);
    return IoCallDriver(TopOfDeviceStack, Irp);
} 
```

# **场景2：Forward and wait**
驱动forward IRP到下层，同时等下层完成IRP后，对IRP做一些其他处理，例如PNP IRP，你收到IRP_MN_START_DEVICE IRP，你需要forward IRP到bus driver，并等它完成后，你才能启动你的设备，XP下有个新的API函数**IoForwardIrpSynchronously**,专干这事。
```C++
NTSTATUS
CompletionRoutine_2(
    IN PDEVICE_OBJECT   DeviceObject,
    IN PIRP             Irp,
    IN PVOID            Context
    )
{ 
  if (Irp->PendingReturned == TRUE) {
    // 
    // You will set the event only if the lower driver has returned
    // STATUS_PENDING earlier. This optimization removes the need to
    // call KeSetEvent unnecessarily and improves performance because the
    // system does not have to acquire an internal lock.  
    // 
    KeSetEvent ((PKEVENT) Context, IO_NO_INCREMENT, FALSE);
  }
  // This is the only status you can return. 停止完成，因为我们驱动还要处理
  return STATUS_MORE_PROCESSING_REQUIRED;  
} 
    
NTSTATUS
DispatchRoutine_2(
    IN PDEVICE_OBJECT DeviceObject,
    IN PIRP Irp
    )
{
    KEVENT   event;
    NTSTATUS status;

    KeInitializeEvent(&event, NotificationEvent, FALSE);

    // 
    // You are setting completion routine, so you must copy
    // current stack location to the next. You cannot skip a location
    // here.
    // 
    IoCopyCurrentIrpStackLocationToNext(Irp);

    IoSetCompletionRoutine(Irp,
                           CompletionRoutine_2,
                           &event,
                           TRUE,
                           TRUE,
                           TRUE
                           );

    status = IoCallDriver(TopOfDeviceStack, Irp);

    if (status == STATUS_PENDING) {
        
       KeWaitForSingleObject(&event,
                             Executive, // WaitReason
                             KernelMode, // must be Kernelmode to prevent the stack getting paged out
                             FALSE,
                             NULL // indefinite wait
                             );
       status = Irp->IoStatus.Status;
    }
    
    // <---- Do your own work here.
    // 
    // Because you stopped the completion of the IRP in the CompletionRoutine
    // by returning STATUS_MORE_PROCESSING_REQUIRED, you must call
    // IoCompleteRequest here.
    // 
    IoCompleteRequest (Irp, IO_NO_INCREMENT);
    return status;

}
```

# **场景3：Forward with a completion routine**
驱动设置completion routine，forward IRP到下层，并返回下层驱动的返回码，在IRP完成过程中，completion routine可以对IRP做一些处理
```C++
NTSTATUS
DispathRoutine_3(
    IN PDEVICE_OBJECT DeviceObject,
    IN PIRP Irp
    )
{
    NTSTATUS status;

    // 
    // Because you are setting completion routine, you must copy the
    // current stack location to the next. You cannot skip a location
    // here.
    // 
    IoCopyCurrentIrpStackLocationToNext(Irp); 

    IoSetCompletionRoutine(Irp,
                           CompletionRoutine_31,// or CompletionRoutine_32
                           NULL,
                           TRUE,
                           TRUE,
                           TRUE
                           );
    
    return IoCallDriver(TopOfDeviceStack, Irp);

} 
```
如果你在Dispatch routine中直接返回下层驱动的返回值，如上，你就不能在completion routine中修改IRP的Status。Irp->IoStatus.Status的值必须和下层驱动的返回值一致。同时必须在completion routine中上传Irp->PendingReturned标记
以下两个版本的completion routine都是可以的：

```C++
NTSTATUS CompletionRoutine_31 (
    IN PDEVICE_OBJECT   DeviceObject,
    IN PIRP             Irp,
    IN PVOID            Context
    )
{   

    // 
    // Because the dispatch routine is returning the status of lower driver
    // as is, you must do the following:
    // 
    if (Irp->PendingReturned) {
        //因为我们在Dispatch routine中返回了PENDING，所以必须mark IRP pending
        IoMarkIrpPending( Irp );
    }
    
    return STATUS_CONTINUE_COMPLETION ; // Make sure of same synchronicity 
}
NTSTATUS
CompletionRoutine_32 (
    IN PDEVICE_OBJECT   DeviceObject,
    IN PIRP             Irp,
    IN PVOID            Context
    )
{   
    // 
    // Because the dispatch routine is returning the status of lower driver
    // as is, you must do the following:
    // 
    if (Irp->PendingReturned) {
        IoMarkIrpPending( Irp );
        //按理说这里也是可以修改IRP的状态的
    }
    
    //    
    // To make sure of the same synchronicity, complete the IRP here.
    // You cannot complete the IRP later in another thread because the 
    // the dispatch routine is returning the status returned by the lower
    // driver as is.
    // 
    IoCompleteRequest( Irp,  IO_NO_INCREMENT);  

    // 
    // Although this is an unusual completion routine that you rarely see,
    // it is discussed here to address all possible ways to handle IRPs.  
    // 
    return STATUS_MORE_PROCESSING_REQUIRED; 
} 
```

所有问题都用异步的思维考虑

# **场景4：Queue for later, or forward and reuse**

当驱动需要对一个IRP排队（以后再处理），Dispatch routine需要mark IRP pending并返回STATUS_PENDING，因为IRP不会马上完成，completion routine中可以修改IRP的Status

```C++
NTSTATUS
DispathRoutine_4(
    IN PDEVICE_OBJECT DeviceObject,
    IN PIRP Irp
    )
{
    NTSTATUS status;

    // 
    // You mark the IRP pending if you are intending to queue the IRP
    // and process it later. If you are intending to forward the IRP 
    // directly, use one of the methods discussed earlier in this article.
    // 
    IoMarkIrpPending( Irp );    

    // 
    // For demonstration purposes: this IRP is forwarded to the lower driver.
    // 
    IoCopyCurrentIrpStackLocationToNext(Irp); 

    IoSetCompletionRoutine(Irp,
                           CompletionRoutine_41, // or CompletionRoutine_42
                           NULL,
                           TRUE,
                           TRUE,
                           TRUE
                           ); 
    IoCallDriver(TopOfDeviceStack, Irp);

    // 
    // Because you marked the IRP pending, you must return pending,
    // regardless of the status of returned by IoCallDriver.
    // 
    return STATUS_PENDING ;

}
```

completion routine中可以返回STATUS_CONTINUE_COMPLETION（继续完成IRP），STATUS_MORE_PROCESSING_REQUIRED（暂停完成，我在其他地方调用IoCompleteRequest）
```C++
NTSTATUS
CompletionRoutine_41(
    IN PDEVICE_OBJECT   DeviceObject,
    IN PIRP             Irp,
    IN PVOID            Context
    )
{ 
    // 
    // By returning STATUS_CONTINUE_COMPLETION , you are relinquishing the 
    // ownership of the IRP. You cannot touch the IRP after this.
    // 
    return STATUS_CONTINUE_COMPLETION ; 
} 


NTSTATUS
CompletionRoutine_42 (
    IN PDEVICE_OBJECT   DeviceObject,
    IN PIRP             Irp,
    IN PVOID            Context
    )
{  
    // 
    // Because you are stopping the completion of the IRP by returning the
    // following status, you must complete the IRP later.
    // 
    return STATUS_MORE_PROCESSING_REQUIRED ; 
} 
```

# **场景5：Complete the IRP in the dispatch routine**
没啥好说的：
```C++
NTSTATUS
DispatchRoutine_5(
    IN PDEVICE_OBJECT DeviceObject,
    IN PIRP Irp
    )
{
    // 
    // <-- Process the IRP here.
    // 
    Irp->IoStatus.Status = STATUS_XXX;
    Irp->IoStatus.Information = YYY;
    IoCompletRequest(Irp, IO_NO_INCREMENT);
    return STATUS_XXX;
} 
```

# Creating IRPs and sending them to another driver
在看下面的场景前，先了解以下驱动创建的同步IRP和异步IRP的区别
https://support.microsoft.com/en-us/kb/326315