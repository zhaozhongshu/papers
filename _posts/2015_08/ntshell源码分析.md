title: ntshell源码分析
date: 2015-08-17 11:22:57
updated: 2015-08-17 11:23:00
tags:
- windows
- native

layout:
comments:
categories:
permalink:

---

[nativeshell](https://github.com/amdf/NativeShell)是在windows启动界面上运行的native程序，它只能调用ntdll的API，下图是nativeshell的运行效果

![](/images/nativeshell.png)

# 显示
使用ZwDisplayString 函数显示一个字符串buffer

# 设备枚举
使用NtPlugPlayControl(PlugPlayControlGetRelatedDevice...)遍历设备信息
```C++
跟设备名为 "HTREE\\ROOT\\0"

NTSTATUS RtlCliGetChildOrSiblingDev(PWCHAR Name,OUT PWCHAR ChildName)
{
    NTSTATUS Status;
    PLUGPLAY_CONTROL_RELATED_DEVICE_DATA arg;
    //
    // Initialize the Root Device Node name
    //
    RtlInitUnicodeString(&arg.TargetDeviceInstance, Name);

    arg.Relation = PNP_GET_CHILD_DEVICE;
    arg.RelatedDeviceInstanceLength = MAX_DEVICE_ID_LEN;
    arg.RelatedDeviceInstance = ChildName;

    // Get the root child node
    return NtPlugPlayControl(PlugPlayControlGetRelatedDevice,&arg,sizeof(arg));
}
```

# 键盘输入
主要是在ring3打开\\Device\\KeyboardClass0设备，并读取input事件（奇怪，我在ring3打开设备没问题，读取设备时，提示权限不够）
```C++
// 打开设备
RtlInitUnicodeString(&keybd, L"\\Device\\KeyboardClass0");
InitializeObjectAttributes(&oa,&keybd,OBJ_CASE_INSENSITIVE,NULL,NULL);

NtCreateFile(&hDriver,
  SYNCHRONIZE | GENERIC_READ | FILE_READ_ATTRIBUTES,
  &oa,
  &Iosb,
  NULL,
  FILE_ATTRIBUTE_NORMAL,
  0,
  FILE_OPEN,
  FILE_DIRECTORY_FILE,  //这里是DIRECTORY_FILE
  NULL,
  0);

InitializeObjectAttributes(&oa, NULL, 0, NULL, NULL);
Status = NtCreateEvent(&hEvent, EVENT_ALL_ACCESS, &oa, 1, 0);

// 读取输入数据
KEYBOARD_INPUT_DATA data;

IO_STATUS_BLOCK Iosb = {0};
LARGE_INTEGER offset = {0};

Status = NtReadFile(hDriver,
    hEvent,
    NULL,
    NULL,
    &Iosb,
    data,
    sizeof(data),
    &offset,
    NULL);
if (Status == STATUS_PENDING)
{
    Status = NtWaitForSingleObject(hEvent, TRUE, NULL);
}
assert((ULONG)Iosb.Information == sizeof(data));
```
