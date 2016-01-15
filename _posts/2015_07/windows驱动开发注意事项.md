title: windows驱动开发注意事项
date: 2015-07-12 12:16:16
updated: 2015-08-06 09:41:22
tags:
- windows
- 驱动

layout:    
comments:
categories:
permalink:

---

#**1.Nt函数与Zw函数区别**

在ring3上，Nt、Zw函数没什么区别，都是通过系统调用中断(INT 2E/SYSENTER)进入ring0
在ring0上，Nt系列函数不经过ssdt表直接调用内核服务，Zw函数经过ssdt调用系统服务，系统认为Zw函数调用都来自a trusted, kernel-mode source，所以**Zw函数都不会校验参数是否合法**。在我们的驱动中，如果参数可能来自ring3，最好调用Nt函数
当ring3程序调用Zw、Nt函数时，通过系统调用，线程进入kernel mode。为了标记调用参数来自ring3，trap handler设置了线程对象的PreviousMode为UserMode。系统函数通过检查PreviousMode判断参数是否来自ring3.
若内核驱动调用系统函数并传入来自内核模式的参数，驱动需要确保PreviousMode为kernelmode。
内核驱动可能运行在任意线程上下文中，对应线程的对象的PreviousMode可能是UserMode，这种情况下，调用Zw函数是比较安全的，让系统函数别校验参数，所有Zw函数都先设置PreviousMode为KernelMode，然后调用对应的Nt函数，当Nt函数返回时，恢复原PreviousMode。
内核驱动也可以直接调用Nt系统函数，当一个IO请求来自ring3、ring0，且PreviousMode未修改时，就可以直接调用Nt系列函数，系统函数会根据PreviousMode判断参数来自ring3还是ring0，并做相应处理
**若参数来自ring0，PreviousMode又是UserMode，或者 参数来自ring3，PreviousMode又是KernelMode,调用Nt函数会发生错误**

例如：假设驱动运行在任意线程上下文，当前线程PreviousMode为UserMode，驱动调用NtClose关闭kernel handle，NtClose函数检查发现参数来自UserMode，从进程句柄表中查找handle返回STATUS_INVALID_HANDLE错误，kernel handle就泄露了。
另一个例子：NtXxx函数带input、output buffer，若PreviousMode = UserMode，Ntxxx函数会调用ProbeForRead or ProbeForWrite校验缓冲区，若buffer参数来自ring0，就会返回STATUS_ACCESS_VIOLATION错误

#**2.含IoSetCompletionRoutine调用的驱动不能动态unloaded**
因为驱动unload前，所有pending IRP必须都调用completion函数
支持安全卸载，请调用IoSetCompletionRoutineEx

#**3.Irp->CurrentLocation为1时如何设置完成回调**
Irp->CurrentLocation为1，表示栈空间只剩一个了，只能IoSkipCurrentIrpStackLocation，而它不能与IoSetCompletionRoutine同时调用(直接覆盖了上层驱动的completion函数)。
如何解决？
先保存上层驱动的completion函数和参数?
然后再调用IoSetCompletionRoutine，在完成函数中记得恢复上层函数的completion函数

#**4.IoMarkIrpPending调用注意事项**

在dispatch例程中，若需要对当前IRP做更多处理，则需要调用IoMarkIrpPending，pend该IRP，以免被IO管理器、其他驱动IoCompleteRequest完成该IRP(会导致IRP释放)

在dispatch例程中调用IoMarkIrpPending后，必须返回STATUS_PENDING(**驱动的返回值意义不大? 确实如此，可能IoCallDriver还没返回时，completion函数已经调用了，这时系统不知道IoCallDriver的返回值**)

若驱动要对IRP排队处理，在入队前，必须IoMarkIrpPending，否则可能在入队时IRP已经被释放、重用

若驱动设置了IRP的IoCompletion，并call lower driver，则在IoCompletion回调中，需检查IRP->PendingReturned标记，若为true，需调用IoMarkIrpPending告诉上层驱动IRP处于pending中(**pending标记上传**)

协议栈顶层驱动的IoCompletion不能去调用IoMarkIrpPending，因为没有顶层驱动的stack location，导致访问异常

若call lower driver后并wait on an event，在IoCompletion中，signal event并返回STATUS_MORE_PROCESSING_REQUIRED(告诉IO管理器IoCompleteRequest后，不要马上free irp，而是等call driver返回后再free)

#**5.IRP完成函数注意事项**
IoCompletion完成函数在DISPATCH_LEVEL上运行，不能访问分页指针.
IoCompletion函数可以check the IRP's I/O status block检查lower driver执行结果
若irp在DispatchRoutine中分配(IoAllocateIrp/IoBuildAsynchronousFsdRequest),IoCompletion中需要IoFreeIrp

#**6.IRP结构**
```C++
typedef struct _IRP {
    CSHORT Type;
    USHORT Size;
    //direct I/O中 内存MDL
    PMDL MdlAddress;
    //各种标识符
    ULONG Flags;
    //执行结果
    IO_STATUS_BLOCK IoStatus;
    //ring0 ring3 ?
    KPROCESSOR_MODE RequestorMode;
    BOOLEAN PendingReturned;
    //驱动调用栈数目
    CHAR StackCount;
    //调用栈帧
...
} IRP;


PIO_STACK_LOCATION IoGetCurrentIrpStackLocation(__in PIRP Irp){
    return Irp->Tail.Overlay.CurrentStackLocation;
}

PIO_STACK_LOCATION IoGetNextIrpStackLocation(__in PIRP Irp){
    return ((Irp)->Tail.Overlay.CurrentStackLocation - 1 );
}

IoMarkIrpPending(__inout PIRP Irp){
    IoGetCurrentIrpStackLocation( (Irp) )->Control |= SL_PENDING_RETURNED;
}

VOID IoSetCompletionRoutine(
    __in PIRP Irp,
    __in_opt PIO_COMPLETION_ROUTINE CompletionRoutine,
    __in_opt __drv_aliasesMem PVOID Context,
    __in BOOLEAN InvokeOnSuccess,
    __in BOOLEAN InvokeOnError,
    __in BOOLEAN InvokeOnCancel){
    PIO_STACK_LOCATION irpSp;

    irpSp = IoGetNextIrpStackLocation(Irp);
    irpSp->CompletionRoutine = CompletionRoutine;
    irpSp->Context = Context;
    irpSp->Control = 0;

    if (InvokeOnSuccess) {
        irpSp->Control = SL_INVOKE_ON_SUCCESS;
    }

    if (InvokeOnError) {
        irpSp->Control |= SL_INVOKE_ON_ERROR;
    }

    if (InvokeOnCancel) {
        irpSp->Control |= SL_INVOKE_ON_CANCEL;
    }
}
注意:IoSetCompletionRoutine不安全，所有IRP完成之前，驱动不能被卸载，支持安全卸载请调用IoSetCompletionRoutineEx

VOID IoSetNextIrpStackLocation (__inout PIRP Irp){
    Irp->CurrentLocation--;
    Irp->Tail.Overlay.CurrentStackLocation--;
}

VOID IoCopyCurrentIrpStackLocationToNext(__inout PIRP Irp){
    PIO_STACK_LOCATION irpSp;
    PIO_STACK_LOCATION nextIrpSp;
    irpSp = IoGetCurrentIrpStackLocation(Irp);
    nextIrpSp = IoGetNextIrpStackLocation(Irp);
    RtlCopyMemory( nextIrpSp, irpSp, FIELD_OFFSET(IO_STACK_LOCATION, CompletionRoutine));
    nextIrpSp->Control = 0;
}

VOID IoSkipCurrentIrpStackLocation (__inout PIRP Irp){
    Irp->CurrentLocation++;
    Irp->Tail.Overlay.CurrentStackLocation++;
}
```

#**6.cancel safe irp queue**
难点：IRP的一些内部状态维护困难,主要是在Dispatch函数与Completion函数中同步，最好用微软提供的现成稳定框架
[cancel safe irp queue](https://msdn.microsoft.com/en-us/library/windows/hardware/ff540755.aspx)

#**7.最好用MmProbeAndLockPages而不是MmIsAddressValid**
MmIsAddressValid只是判断调用时刻内存地址状态，随后状态可能会改变
MmProbeAndLockPages调用会确保地址有效

##**8.驱动交叉签名证书过期怎么办**
改系统时间，重新签名即可

##**9.Kernel Dispatcher Objects**
内核中的Dispatcher object类型有：timer objects, event objects, semaphore objects, mutex objects, and thread objects。
驱动可以使用dispatcher objects来做同步，调用KeWaitForSingleObject、KeWaitForMutexObject、KeWaitForMultipleObjects。
**哪些情况下可以使用Dispatcher Objects?**
>确定上下文线程中执行(例如自己创建的系统线程中、在DriverEntry、AddDevice、Reinitialize、Unload回调函数中、设备栈顶层的驱动Dispatch函数中、设备栈非顶层但使用同步IO请求的Dispatch函数中)
不能在DISPATCH_LEVEL中
DriverEntry, AddDevice, Reinitialize, and Unload回调函数中可以等待 
The dispatch routines of a highest-level driver可以等待
The dispatch routines of lower-level drivers 同步IO操作可以等待
The dispatch routines of lower-level drivers 异步IO操作中不能等待 
DISPATCH_LEVEL中不能等待. 
若IO操作在与paging device传输数据，不能等待 

##**10.Timer Objects and DPCs**
定时器初始化：
>void KeInitializeTimer( IN PKTIMER  Timer );
>VOID KeInitializeTimerEx( IN PKTIMER  Timer,IN TIMER_TYPE  Type);

通过Type可以指定是synchronization(一次唤醒一个线程，自动reset)、notification(唤醒所有线程，手动reset)定时器
定时器启动：
>BOOLEAN KeSetTimer(IN PKTIMER  Timer,IN LARGE_INTEGER  DueTime,IN PKDPC  Dpc OPTIONAL);
>BOOLEAN KeSetTimerEx(IN PKTIMER  Timer,IN LARGE_INTEGER  DueTime,IN LONG  Period OPTIONAL,IN PKDPC  Dpc);

前者启动expire just once定时器，后者启动expire repeatedly定时器

##**再讨论IRP处理**
若完成函数要返回STATUS_PENDING，必须先调用IoMarkIrpPending mark IRP pending
函数调用实质是：
```C++
IoGetCurrentIrpStackLocation( (Irp) )->Control |= SL_PENDING_RETURNED;
```
同样，若完成函数中调用了IoMarkIrpPending,则完成函数一定要返回STATUS_PENDING
一旦调用IoCompleteRequest，IRP就会被完成、释放
以下代码也是有效的，只是速度慢一点：
```C++
IoMarkIrpPending(Irp);
(VOID)IoCallDriver(BottomDeviceObject, Irp);
return STATUS_PENDING;
```
