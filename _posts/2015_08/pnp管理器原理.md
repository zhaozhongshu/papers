title: pnp管理器原理
date: 2015-08-17 14:22:24
updated: 2015-08-17 14:22:26
tags:
- 算法

layout:
comments:
categories:
permalink:

---
# 应用层
应用层主要是Plug and Play服务，该服务启动如下几条工作线程：

## 1.RPC服务线程
plugplay服务通过RPC向其他组件导出一组函数接口，
主要代码如下：
```C++
#if 0
    /* XP-compatible protocol sequence/endpoint */
    Status = RpcServerUseProtseqEpW(L"ncacn_np", 20, L"\\pipe\\ntsvcs", NULL);
#endif

    /* Vista-compatible protocol sequence/endpoint */
    Status = RpcServerUseProtseqEpW(L"ncacn_np",20, L"\\pipe\\plugplay", NULL);
    Status = RpcServerRegisterIf(pnp_v1_0_s_ifspec, NULL,NULL);
```
导出的RPC函数主要有这些,这些函数都是通过操作注册表、调用NtPlugPlayControl来完成的
```C++
PNP_Disconnect
PNP_Connect
PNP_GetVersion
PNP_GetGlobalState
PNP_InitDetection
PNP_ReportLogOn
PNP_ValidateDeviceInstance
PNP_GetRootDeviceInstance
PNP_GetRelatedDeviceInstance
PNP_EnumerateSubKeys
PNP_GetDeviceList
PNP_GetDeviceListSize
PNP_GetDepth
PNP_GetDeviceRegProp
PNP_SetDeviceRegProp
PNP_GetClassInstance
PNP_CreateKey
PNP_DeleteRegistryKey
PNP_GetClassCount
PNP_GetClassName
PNP_DeleteClassKey
PNP_GetInterfaceDeviceAlias
PNP_GetInterfaceDeviceList
PNP_GetInterfaceDeviceListSize
PNP_RegisterDeviceClassAssociation
PNP_UnregisterDeviceClassAssociation
PNP_GetClassRegProp
PNP_SetClassRegProp
PNP_CreateDevInst
PNP_DeviceInstanceAction
PNP_GetDeviceStatus
PNP_SetDeviceProblem
PNP_DisableDevInst
PNP_UninstallDevInst
PNP_AddID
PNP_RegisterDriver
PNP_QueryRemove
PNP_RequestDeviceEject
PNP_IsDockStationPresent
PNP_RequestEjectPC
PNP_HwProfFlags
PNP_GetHwProfInfo
PNP_AddEmptyLogConf
PNP_FreeLogConf
PNP_GetFirstLogConf
PNP_GetNextLogConf
PNP_GetLogConfPriority
PNP_AddResDes
PNP_FreeResDes
PNP_GetNextResDes
PNP_GetResDesData
PNP_GetResDesDataSize
PNP_ModifyResDes
PNP_DetectResourceConflict
PNP_QueryResConfList
PNP_SetHwProf
PNP_QueryArbitratorFreeData
PNP_QueryArbitratorFreeSize
PNP_RunDetection
PNP_RegisterNotification
PNP_UnregisterNotification
PNP_GetCustomDevProp
PNP_GetVersionInternal
PNP_GetBlockedDriverInfo
PNP_GetServerSideDeviceInstallFlags
PNP_GetObjectPropKeys
PNP_GetObjectProp
PNP_SetObjectProp
PNP_InstallDevInst
PNP_ApplyPowerSettings
PNP_DriverStoreAddDriverPackage
PNP_DriverStoreDeleteDriverPackage
PNP_RegisterServiceNotification
PNP_SetActiveService
PNP_DeleteServiceDevices
```

## PNP侦听线程
循环调用NtGetPlugPlayEvent获取PNP各种事件
如果时间GUID为GUID_DEVICE_ENUMERATED，则放入安装队列，并唤醒PNP安装线程
```C++
for (;;)
{
    DPRINT("Calling NtGetPlugPlayEvent()\n");

    /* Wait for the next pnp event */
    Status = NtGetPlugPlayEvent(0, 0, PnpEvent, PnpEventSize);
    // 处理事件

    /* Dequeue the current pnp event and signal the next one */
    NtPlugPlayControl(PlugPlayControlUserResponse, NULL, 0);
}
```

## PNP安装线程
主要负责安装PNP侦听线程发现的安装请求

# 内核层
主要看内核态下NtGetPlugPlayEvent、NtPlugPlayControl函数的实现
应用层调用NtGetPlugPlayEvent、NtPlugPlayControl都需要有SeTcbPrivilege权限
```C++
/*
 * NtPlugPlayControl
 * A function for doing various Plug & Play operations from user mode.
 * Parameters
 *    PlugPlayControlClass
 *       0x00   Reenumerate device tree
 *              Buffer points to UNICODE_STRING decribing the instance
 *              path (like "HTREE\ROOT\0" or "Root\ACPI_HAL\0000"). For
 *              more information about instance paths see !devnode command
 *              in kernel debugger or look at "Inside Windows 2000" book,
 *              chapter "Driver Loading, Initialization, and Installation".
 *       0x01   Register new device
 *       0x02   Deregister device
 *       0x03   Initialize device
 *       0x04   Start device
 *       0x06   Query and remove device
 *       0x07   User response
 *              Called after processing the message from NtGetPlugPlayEvent.
 *       0x08   Generate legacy device
 *       0x09   Get interface device list
 *       0x0A   Get property data
 *       0x0B   Device class association (Registration)
 *       0x0C   Get related device
 *       0x0D   Get device interface alias
 *       0x0E   Get/set/clear device status
 *       0x0F   Get device depth
 *       0x10   Query device relations
 *       0x11   Query target device relation
 *       0x12   Query conflict list
 *       0x13   Retrieve dock data
 *       0x14   Reset device
 *       0x15   Halt device
 *       0x16   Get blocked driver data
 *
 *    Buffer
 *       The buffer contains information that is specific to each control
 *       code. The buffer is read-only.
 *
 *    BufferSize
 *       Size of the buffer pointed by the Buffer parameter. If the
 *       buffer size specifies incorrect value for specified control
 *       code, error ??? is returned.
 * Return Values
 *    STATUS_PRIVILEGE_NOT_HELD
 *    STATUS_SUCCESS
 *    ...
 */
```

# CM_Reenumerate_DevNode调用重新安装枚举设备文件
函数最会调用RPC函数：
```C++
PNP_DeviceInstanceAction(BindingHandle,PNP_DEVINST_REENUMERATE,ulFlags,lpDevInst,NULL);
```