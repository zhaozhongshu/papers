title: windbg调试技巧
date: 2015-07-14 09:46:30
updated: 2015-07-14 18:29:21
tags:
- windows
- 驱动
- 调试

layout:    
comments:
categories:
permalink:
---

#Evaluating Expressions
windbg支持MASM、C++两种表达式，默认使用MASM表达式，**在MASM表达式中，所有符号都被当作地址处理.
C++表达式中，符号都有实际的数据类型信息**.
>.expr /s C++   切换到C++表达式. 
>?? (C++表达式) ??后面内容当作C++表达式处理
>watch/locals windows使用C++表达式
>一些extension commands只支持MASM表达式

一些案例

**条件断点**
下面是一条bp + MASM表达式的条件断点,数字默认是16进制，0n开头是10进制
>0:000> bp MyFunction+0x43 "j ( poi(MyVar)>0n20 ) ''; 'gc'" 

若MyVar在C代码中是一个整数变量，MASM把所有符号当作地址,必须要用poi(MyVar)取变量的值
j表达式为if、else表达式 j(expr) code1;code2
gc表示继续执行
上面语句含义:
```C++
if( MyVar > 20 ){
    //什么也不做,断下来了
}
else{
    gc; 表示continue
}
```
在MyVar大于20的时候断下来

**条件表达式**
```C++
0:000> ? ecx*(eax>ebx) + 7*(eax<ebx) + 3*(eax=ebx) 
?表示一条MASM表达式
若eax大于ebx则表达式加ecx，若eax大于ebx，则表达式加7，若eax==ebx则表达式加3，因为MASM表达式中=是比较符不是赋值语句

0:000> ?? @ecx*(int)(@eax>@ebx) + 7*(int)(@eax<@ebx) + 3*(int)(@eax==@ebx) 
??表示一条C++表达式，在C++语法中,@表示紧跟寄存器
```
执行结果如下：
```C++
Current expression evaluator: MASM - Microsoft Assembler expressions
0:000> ? ecx*(eax>ebx) + 7*(eax<ebx) + 3*(eax=ebx)
Evaluate expression: 3 = 00000000`00000003
0:000> ?? @ecx*(int)(@eax>@ebx) + 7*(int)(@eax<@ebx) + 3*(int)(@eax==@ebx)
unsigned int64 3
```

**C++表达式**
若myInt类型为ULONG32，且默认为MASM表达式解析
0:000> ?? myInt     c++表达式
0:000> dd myInt L1  MASM表达式
0:000> ? myInt      MASM表达式myInt符号地址

**C++/MASM混合**
在C++表达式中，你无法使用源码行号，@@()表示嵌入不同模式下的表达式，如下是在C++表达式中嵌入MASM表达式，判断MyPtr指针是否指向地址myfile.c:43
>0:000> ?? MyPtr = @@( `myfile.c:43` )

如下是在MASM表达式中嵌入C++表达式(Expression2为C++表达式)
>0:000> .expr /s masm 
>0:000> bp Expression1 + @@( Expression2 ) + Expression3 
若myInt类型为ULONG64，要在myInt后面紧跟另一个ULONG64变量，C++表达式和MASM表达式下内存访问断点：
>0:000> ba r8 @@( &myInt + 1 ) 
>0:000> ba r8 myInt + 8 

**查看结构体**
C++表达式会把一些加寄存器pseudo-register转成响应的类型，例如$teb 转成 TEB*,@表示引用一个寄存器,$teb是个假寄存器
>kd> ??  @$teb->ClientId.UniqueProcess 

#breakpoints
>bu 符号/DLL未加载时，设置对应断点，例如user32未加载，bu user32!MessageBoxW
>bm 设置通配符断点，例如bm kernel32!Create*
>ba 内存读写、执行断点 ba e4 xxx 执行断点 ba r4 xxx访问断点 ba w4 xxx写入断点
>bu MyFunction+0x47 ".dump c:\mydump.dmp; g" 未加载符号断点，断下来后生成dump，并continue

**内核调试中，要给某个用户进程下断点**
下断前，先切换进程地址空间到目标进程
>!process 0 0   打印当前所有进程
>.process /i    目标进程EPROCESS 切换到目标进程
>g;             等待切换到目标进程
>!process       可以看到已经切换到目标进程了

然后可以用bp、bm、bu、ba下断了

#读写内存

**虚拟内存读写**
可以在memory windows中读写内存
也可以使用命令读写内存
读内存
>db 
>dw
>dd 
>dq
>du

写内存
>eb
>ew
>ed
>eq
>eu

>dt     查看类型
>ds     查看ANSI_STRING
>dS     查看UNICODE_STRING
>dl     查询单向双向链表
>d*s    查看值且解析地址对应的符号 一般都用dps查看地址对应的符号
>!address 查看地址信息
>ln     查看与地址最接近的符号

>m Range Address 移动内存
>f      填充内存块
>c      比较内存块
>s      查找内存
>\#[Pattern] [Address [ L Size ]]  在指定范围内查找指令流
>a   addr 进入修改汇编指令模式 （退出汇编指令模式：ctrl+c 回车）

```
!address查看地址信息

0:000> !address 77782660 
Usage:                  Image
Allocation Base:        00000000`77650000
Base Address:           00000000`77782000
End Address:            00000000`77783000
Region Size:            00000000`00001000
Type:                   01000000    MEM_IMAGE
State:                  00001000    MEM_COMMIT
Protect:                00000004    PAGE_READWRITE
More info:              lmv m ntdll
More info:              !lmi ntdll
More info:              ln 0x77782660
```

```
main ~~ main + 0x1000 之间查找strlen函数调用
# "strlen" main L1000

main ~~ main + 0x1000 之间查找 call 指令
# "call" main L1000
```

```
使用a修改代码，想让fn1直接返回
0:002> uf fn1
Flow analysis was incomplete, some code may be missing
fn1:
 2004 00000000`0117d410 55              push    rbp
 2004 00000000`0117d411 8bec            mov     ebp,esp
 2004 00000000`0117d413 6aff            push    0FFFFFFFFFFFFFFFFh
 ...

0:002> a 输入a回车，进入Input>模式
00000000`776a0590 

直接输入ret指令
00000000`776a0590 ret
ret

ctrl+c 回车

0:002:x86> uf fn1 
fn1:
 2004 0117d410 c3 ret

 可以看到已经修改为ret指令了

```

```
ln查找相邻符号

0:000> ln 0x77782660
(00000000`77782640)   ntdll!PebLdr+0x20   |  (00000000`77782448)   ntdll!LdrpNtDllDataTableEntry
```

```
m 移动内存块 0028eff0 ~ 0028eff0+8 到 0028f000

0:000> db 0028eff0 
00000000`0028eff0  00 60 fd ff ff 07 00 00-50 26 78 77 00 00 00 00  .`......P&xw....
00000000`0028f000  50 26 78 77 00 00 00 00-00 00 00 00 00 00 00 00  P&xw............
0:000> m 0028eff0 L8 0028f000  
0:000> db 0028eff0 
00000000`0028eff0  00 60 fd ff ff 07 00 00-50 26 78 77 00 00 00 00  .`......P&xw....
00000000`0028f000  00 60 fd ff ff 07 00 00-00 00 00 00 00 00 00 00  .`..............
```

```
c比较内存块

void main()
{
    char rgBuf1[100];
    char rgBuf2[100];
    ...
}

0:000> c rgBuf1 L 0n100 rgBuf2

```

```
s查找内存
s -u 00000000 L7ffffff "notepad"    在0 ~ 7ffffff内存段中查找宽字符串"notepad"
s -a 00000000 L7ffffff "notepad"    在0 ~ 7ffffff内存段中查找字符串"notepad"
s    00000000 L7ffffff 48 65 6c     在0 ~ 7ffffff内存段中查找二进制串48 65 6c
```

**物理内存读写**
使用扩展指令读写物理内存
>!eb 写内存
>!ed 写内存
>!db
>!dw
>!dd
>!search 搜索物理内存

**读写符号值**
>0:000> ? MyCounter 
Evaluate expression: 1244892 = 0012fedc
0:000> dd 0x0012fedc L1 
0012fedc  00000052
0:000> ed MyCounter 83  修改MyCounter值为83

#调试多进程多线程时线程、进程的切换
>| 列出所有被调试进程(可以同时调试多个进程)
2:005> |*
2:005> |. 显示当前活动进程
2:005> |# 显示触发异常进程
2:005> |2 显示2号进程
2:005> |2s 切换到2号进程
~ 列出所有线程
0:001> ~*kvnf 对所有线程应用命令kvnf
0:001> ~. 列出active线程
0:001> ~# 查看触发异常线程
0:001> ~2 查看2号线程
0:001> ~2s 切换到2号线程
0:001> ~2n suspend 2号线程
0:001> ~2m resume 2号线程
0:001> ~2f freeze 2号线程
0:001> ~2u unfreeze 2号线程
~e 对某条线程执行某个命令
0:001> ~2e !gle 查看2号线程的last error
0:001> ~*e !gle 查看所有线程的last error

#内核模式下特有的调试技巧
>.crash 强制crash系统
.reboot 强制重启系统

内核调试中，存在大量的进程、线程、stask、session等，首先需要理解5大context，才能更好的调试
>session context            用户上下文 用户session
process context             进程上下文 当前virtual address space属于哪个进程
user-mode address context   一般不直接设置,切换process context后，它也自动切换
register context            一般也叫做线程上下文
local context               局部变量上下文 一个线程stack中的一个frame


**session context**
>!session 切换、查看session
!sprocess session上的进程
!spoolused session上使用的内存

**process context**
每个进程都有自己单独的页目录(page directory)，用于记录本进程虚拟地址向物理地址的映射表。
在用户模式调试user-debugging中，当前晋城的process context是确定的，可以直接对当前进程地址空间做任意操作。
在kernel-debugging中，需要**.process**命令选择一个目标进程的page directory，来解析虚拟地址
**.process /i xxx**同时还可以切换到目标进程的用户地址空间，kernel debugger可以设置用户进程断点。 
>!process 0 0 打印所有进程
!process 当前page directory对应的进程
.process /i xxx 切换到目标进程
.process /i /r xxx 切换到目标进程并reload ring3符号

**Register Context**
>.cxr xxx   切换寄存器上下文(xxx为context record地址)
.ecxr       切换到触发异常的寄存器上下文
.thread /r /p xxx 切换到目标线程，并reload PTD，且reload user symbol
.trap       展示一个trap frame
```
kd> .thread /p /r 821b7b30 
Implicit thread is now 821b7b30
Implicit process is now 821b9830
.cache forcedecodeuser done
Loading User Symbols
```

**local Context**
>.frame xx              切换到xx处的栈帧
!for_each_frame "xxx"   对所有栈帧执行xxx命令
!for_each_frame "x"     打印所有栈帧下的local变量 

#Mapping Driver Files
为了调试一个驱动，每次修改时，都需要把新驱动copy到目标机器指定目录，这样很麻烦低效，map用来解决这个问题
定义map规则文件d:\dbg\DemoSys.ini,文件内容如下:
```
map
\Systemroot\system32\drivers\DemoSys.sys #目标机器旧驱动位置
d:\dbg\DemoSys.sys                       #本机新驱动位置
map
\Systemroot\system32\drivers\hao123.sys #目标机器旧驱动位置
d:\dbg\hao123.sys                       #本机新驱动位置
```
加载map规则
.kdfiles d:\dbg\DemoSys.ini
以后目标机器每加载一个驱动前，都会先查询windbg是否需要更新该驱动，并从本机更新最新的驱动，保证每次加载的驱动都是最新

#Debugger Extensions
>.load DLLName 加载插件dll
.unload DLLName 卸载插件DLL
.chain 列出所有已加载插件DLL
![dllname.]extension [arguments] 调用某个插件

#应用层windbg远程调试
我们知道visual studio中有一个非常优秀的远程调试工具msvsmon.exe
windbg中同样也支持远程调试dbgsrv，调试步奏：
>1.拷贝dbgsrv.exe、dbghelp.dll、dbgeng.dll到目标目录
2.目标机执行dbgsrv.exe -t tcp:port=9999 在999端口上侦听
3.windbg -premote tcp:port=9999,server=192.168.220.145
4.attach自己想要调试的进程

#Crash Dump Files
**Forcing a System Crash from the Keyboard**
With USB keyboards, you must enable the keyboard-initiated crash in the registry. In the registry key HKEY_LOCAL_MACHINE\System\CurrentControlSet\Services\kbdhid\Parameters, create a value named CrashOnCtrlScroll, and set it equal to a REG_DWORD value of 0x01. 
**Hold down the rightmost CTRL key, and press the SCROLL LOCK key twice.**

分析内核dump常用命令
>!drivers 7     展示所有加载的驱动，内存使用等信息
!kdext*.locks   所有锁
!locks 
!memusage       内存使用
!vm             虚拟内存使用
!process 0 0    所有进程
!process 0 7    所有进程所有信息

#其他一些常用命令汇总
>?      执行表达式
??      执行C++表达式
gc      从条件断点中continue
gh      从异常中continen，标记异常已被处理
gn      从异常中continue，标记异常未被处理
gu      执行到函数返回
p       单步
pa          单步执行到目标地址
.call       让目标进程执行目标函数
.chain      加载的插件DLL列表
.childdbg   调试子进程
.closehandle    关闭句柄
.closehandle -a 关闭进程所有句柄
.crash      强制蓝屏
.fnret      显示函数返回值

#扩展命令汇总
>!acl       打印一个ACL控制列表
!address    查看地址信息(内存分配、访问属性)
!analyze    分析异常信息
!chksym     检查某个符号有效性
!cppexr     计算一个C++表达式的值
!cpuid      CPUID信息
!cs -l -o   查看所有被占用锁对应线程信息
!dh         查看某个image的PE头
!dlls       查看进程加载的DLL列表
!dlls -v    查看进程加载的DLL列表+DLL版本信息
!envvar     展示环境变量
!exchain    打印callstack中的异常处理链
!for_each_frame     针对所有frame执行某条命令
!for_each_local     针对所有locals变量执行某条命令
!for_each_module    针对所有加载模块执行某条命令
!gle        当前线程 last error
!gs         检测/GS栈溢出
!handle     句柄信息
!heap       堆破坏分析
!htrace     句柄使用跟踪分析（打开、关闭、等）
!kuser      查看shared user-mode page (KUSER_SHARED_DATA)
!list       打印一个链表管理的所有元素
!lmi        查看一个DLL信息
!sd         打印一个security descriptor
!std_map    打印一个stdmap（貌似不起作用）
!stl        打印stl变量(貌似不起作用）
!tp         线程池信息

**内核模式下有效的扩展**
>!apc       打印APC信息
!deadlock   死锁检测(需要结合app verifier使用)
!devhandles 打印一个设备对象上打开的所有handle
!devnode    打印设备树种一个、N个节点  !devnode 0 1打印整个设备树
!devobj     查看一个deviceobject信息
!devstack   查看一个设备对象相关设备栈 
!dpa        内存池分配信息
!drvobj     驱动对象信息
!fileobj    查看FILE_OBJECT
!irp        查看一个irp对象
!irpfind    在非分页池中查找所有的irp对象
!locks      打印锁信息
!object     查看一个内核对象
!obtrace    跟踪一个内核对象使用情况(需要gflags中Object Reference Tracing开启)
!process    打印进程信息，使用!process 0 0查看所有进程,使用!process 81c802d0 7查看指定进程
!stacks     打印内核栈信息
!validatelist 校验一个地址是否为有效的LIST_ENTRY
!verifier   展示驱动verifier信息

**用户模式下有效的扩展**
>!avrf      verifier信息
!critsec    查看一个critical_section的信息(先用!locks获取存在问题的锁)
!findstack  查找堆栈上包含指定符号的线程
!locks      分析死锁的神器 (不过没有!cs好用)
!runaway    分析CPU消耗高的神器
!threadtoken 查看线程TOKEN信息
!vadump     查看进程中虚拟内存分配情况

**NDIS Extensions (Ndiskd.dll)**
>!ndiskd.dbglevel    
!ndiskd.filters     所有filters
...

**RPC Extensions (Rpcexts.dll)**

#实际操作案例
```
打印一个对象的安全信息，例如\device\physicalmemory

kd> !object \device\physicalmemory
Object: e10018a8  Type: (821b5560) Section
    ObjectHeader: e1001890 (old version)
    HandleCount: 0  PointerCount: 2
    Directory Object: e100d670  Name: PhysicalMemory

kd> dt nt!_OBJECT_HEADER e1001890
   +0x000 PointerCount     : 0n2
   +0x004 HandleCount      : 0n0
   +0x004 NextToFree       : (null) 
   +0x008 Type             : 0x821b5560 _OBJECT_TYPE
   +0x00c NameInfoOffset   : 0x10 ''
   +0x00d HandleInfoOffset : 0 ''
   +0x00e QuotaInfoOffset  : 0 ''
   +0x00f Flags            : 0x32 '2'
   +0x010 ObjectCreateInfo : 0x00000001 _OBJECT_CREATE_INFORMATION
   +0x010 QuotaBlockCharged : 0x00000001 Void
   +0x014 SecurityDescriptor : 0xe100e77b Void
   +0x018 Body             : _QUAD

该对象的安全描述符显示为0xe100e77b，其低三位代表指针在本结构中的偏移量，实际SECURITY_DESCRIPTOR指针应该是 0xe100e77b & ~0x7 = 0xe100e778

kd> !sd 0xe100e778
->Revision: 0x1
->Sbz1    : 0x0
->Control : 0x8004
            SE_DACL_PRESENT
            SE_SELF_RELATIVE
->Owner   : S-1-5-32-544
->Group   : S-1-5-18
->Dacl    : 
->Dacl    : ->AclRevision: 0x2
->Dacl    : ->Sbz1       : 0x0
->Dacl    : ->AclSize    : 0x44
->Dacl    : ->AceCount   : 0x2
->Dacl    : ->Sbz2       : 0x0
->Dacl    : ->Ace[0]: ->AceType: ACCESS_ALLOWED_ACE_TYPE
->Dacl    : ->Ace[0]: ->AceFlags: 0x0
->Dacl    : ->Ace[0]: ->AceSize: 0x14
->Dacl    : ->Ace[0]: ->Mask : 0x000f001f
->Dacl    : ->Ace[0]: ->SID: S-1-5-18

->Dacl    : ->Ace[1]: ->AceType: ACCESS_ALLOWED_ACE_TYPE
->Dacl    : ->Ace[1]: ->AceFlags: 0x0
->Dacl    : ->Ace[1]: ->AceSize: 0x18
->Dacl    : ->Ace[1]: ->Mask : 0x0002000d
->Dacl    : ->Ace[1]: ->SID: S-1-5-32-544

->Sacl    :  is NULL
```

```
内核调试器下，查看某个ring3进程死锁信息
.process /s /i xxx  切换到该进程上下文
g
.reload             加载ring3符号
!cs -l -o           查看占用锁的线程

```

```
查看进程句柄0x14的信息
0:000:x86> !handle 14 0xe
Handle 14
  Attributes    0
  GrantedAccess 0x9:
         None
         QueryValue,EnumSubKey
  HandleCount   2
  PointerCount  3
  Name          \REGISTRY\MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options
  Object Specific Information
    Key last write time:  20:03:29. 5/19/2015
    Key name Image File Execution Options

```

```
句柄使用分析
!htrace -enable     开启跟踪（之后所有的句柄操作都会被记录下来）
!htrace 14          查询14号句柄操作信息
!htrace -disable    完成分析后关掉trace
```

```
分析设备对象的一些信息
!devnode 0 1 打印整个设备树
kd> !devnode 0 1
Dumping IopRootDeviceNode (= 0x821a4ee8)
DevNode 0x821a4ee8 for PDO 0x821a4020
  InstancePath is "HTREE\ROOT\0"
  State = DeviceNodeStarted (0x308)
  Previous State = DeviceNodeEnumerateCompletion (0x30d)
  DevNode 0x821a4b20 for PDO 0x821a4c68
    InstancePath is "Root\ACPI_HAL\0000"
    State = DeviceNodeStarted (0x308)
    Previous State = DeviceNodeEnumerateCompletion (0x30d)
    DevNode 0x8219f570 for PDO 0x821a0de0
      InstancePath is "ACPI_HAL\PNP0C08\0"
      ServiceName is "ACPI"
      State = DeviceNodeStarted (0x308)
      Previous State = DeviceNodeEnumerateCompletion (0x30d)
  DevNode 0x821e73a8 for PDO 0x821e74f0
    InstancePath is "Root\VMWVMCIHOSTDEV\0000"
    ServiceName is "vmci"
    State = DeviceNodeStarted (0x308)
    Previous State = DeviceNodeEnumerateCompletion (0x30d)

查看Root\VMWVMCIHOSTDEV\0000设备对象详细信息
kd> !devnode 0x821e73a8 
DevNode 0x821e73a8 for PDO 0x821e74f0
  Parent 0x821a4ee8   Sibling 0000000000   Child 0000000000
  InstancePath is "Root\VMWVMCIHOSTDEV\0000"
  ServiceName is "vmci"
  State = DeviceNodeStarted (0x308)
  Previous State = DeviceNodeEnumerateCompletion (0x30d)
  StateHistory[07] = DeviceNodeEnumerateCompletion (0x30d)
  StateHistory[06] = DeviceNodeStarted (0x308)
  ...
  Flags (0x00000131)  DNF_MADEUP, DNF_ENUMERATED, 
                      DNF_IDS_QUERIED, DNF_NO_RESOURCE_REQUIRED

想查看vmci设备都有哪些进程持有其句柄
kd> !devhandles 0x821e74f0

Checking handle table for process 0x81c72520
Handle table at e1a5f000 with 147 entries in use

PROCESS 81c72520  SessionId: 0  Cid: 068c    Peb: 7ffde000  ParentCid: 0598
    DirBase: 04040180  ObjectTable: e15a67b0  HandleCount: 147.
    Image: vmtoolsd.exe
01b8: Object: 81b4ef90  GrantedAccess: 00120089 Entry: e1a5f370
Object: 81b4ef90  Type: (821eb040) File
    ObjectHeader: 81b4ef78 (old version)
        HandleCount: 1  PointerCount: 1

PROCESS 81c72520  SessionId: 0  Cid: 068c    Peb: 7ffde000  ParentCid: 0598
    DirBase: 04040180  ObjectTable: e15a67b0  HandleCount: 147.
    Image: vmtoolsd.exe
01c0: Object: 81b4eef8  GrantedAccess: 0012019f Entry: e1a5f380
Object: 81b4eef8  Type: (821eb040) File
    ObjectHeader: 81b4eee0 (old version)
        HandleCount: 1  PointerCount: 1

Checking handle table for process 0x81fe8a70
Handle table at e1a78000 with 65 entries in use
...

//vmtoolsd.exe在vmci设备上持有两个句柄 81b4ef90 81b4eef8,这两个句柄猜测应该都是FILE_OBJECT
kd> !object 81b4ef90
Object: 81b4ef90  Type: (821eb040) File
    ObjectHeader: 81b4ef78 (old version)
    HandleCount: 1  PointerCount: 1
kd> !object 81b4eef8
Object: 81b4eef8  Type: (821eb040) File
    ObjectHeader: 81b4eee0 (old version)
    HandleCount: 1  PointerCount: 1
果然都是file_object


查看设备堆栈
kd> !devstack 0x821e74f0
  !DevObj   !DrvObj            !DevExt   ObjectName
  81c9fc20  \Driver\vmci       81c9fcd8  VMCIHostDev
> 821e74f0  \Driver\PnpManager 821e75a8  00000034
!DevNode 821e73a8 :
  DeviceInst is "Root\VMWVMCIHOSTDEV\0000"
  ServiceName is "vmci"


```

```
使用!findstack查找包含符号CWinThread的线程堆栈
!sw 32 切换到32位模式
!findstack CWinThread 

```

#windbg调试技巧
**学会使用!analyze -v **
分析问题第一步应该就是!analyze -v ，并仔细看一下给出的分析报告
**设置条件断点**
>bp/bm/bu xxx "j(exp1) ; 'gc;'"
>bp /t @$thread nt!ntopenfile 只在当前线程生效的断点($thread是个假寄存器，保存当前线程ID)
