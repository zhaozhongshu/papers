title: vs2015下的android开发
date: 2015-12-29 11:06:28
updated: 2015-12-08 09:33:03
tags:
- java
- c++
- android
- vs2015

layout:
comments:
categories:
permalink:

---
* **[vs2015的安装](#1.vs2015的安装)**
* **[ndk资源](#2.ndk资源)**
* **[StaticLibrary(Android)](#3.StaticLibrary_Android)**


#1.vs2015的安装#
vs2015全部安装需要占用很大的磁盘空间，最好预留20G，安装完成之后，可以看到VS有这几个跟移动相关的工程向导
C++部分

- OpenGLES 2 Application(Android IOS Widnows Universal)
- Native-Activity App(Android)
- OpenGLES Application(Android, IOS)
- Shared Library(Android, IOS)
- Basic Application(Android)
- Dynamic Library(Windows) for Clang 3.7 with Microsoft CodeGen
- Dynamic Shared Library(Android)
- Static Library(Android)
- Static Library(IOS)
- Static Library(Windows) for Clang 3.7 with Microsoft CodeGen
- Makefile Project(Android)

Javascript部分

- Cordova App

显著的几个特点：

- 支持android、IOS、windows，
- 跨平台(C++具有良好的跨平台性:java只能运行在android上， objc只能运行在IOS上)，所以公共部分最好用C++实现、或者hybird方式实现
- 全面支持clang(clang是个好东西，底层用llvm)


#2.ndk资源#
可以看一下ndk为我们提供了些什么资源

**NDK的编译脚本，在BUILD SCRIPT中可以通过INCLUDE调用**

    
    add-application.mk
    add-platform.mk
    add-toolchain.mk
    build-all.mk
    build-binary.mk
    build-executable.mk
    build-local.mk
    build-module.mk
    build-shared-library.mk
    build-static-library.mk
    check-cygwin-make.mk
    clear-vars.mk
    default-application.mk
    default-build-commands.mk
    definitions-graph.mk
    definitions-host.mk
    definitions-tests.mk
    definitions-utils.mk
    definitions.mk
    import-locals.mk
    init.mk
    main.mk
    prebuilt-library.mk
    prebuilt-shared-library.mk
    prebuilt-static-library.mk
    setup-abi.mk
    setup-app.mk
    setup-imports.mk
    setup-toolchain.mk
    build-analyzer.sh
    build-ccache.sh
    build-compiler-rt.sh
    build-cxx-stl.sh
    build-device-llvm.sh
    build-docs.sh
    build-gcc.sh
    build-gdb-stub.sh
    build-gdbserver.sh
    build-gnu-libstdc++.sh
    build-host-awk.sh
    build-host-gcc.sh
    build-host-gdb.sh
    build-host-make.sh
    build-host-perl.sh
    build-host-prebuilts.sh
    build-host-python.sh
    build-host-sed.sh
    build-host-toolbox.sh
    build-host-yasm.sh
    build-libportable.sh
    build-llvm.sh
    build-mingw64-toolchain.sh
    build-ndk-depends.sh
    build-ndk-stack.sh
    build-ndk-sysroot.sh
    build-on-device-toolchain.sh
    build-target-prebuilts.sh
    builder-funcs.sh
    check-glibc.sh
    cleanup-apps.sh
    cleanup-headers.sh
    common-build-host-funcs.sh
    deploy-host-mcld.sh
    dev-cleanup.sh
    dev-defaults.sh
    dev-platform-compress.sh
    dev-platform-expand-all.sh
    dev-platform-expand.sh
    dev-platform-import.sh
    dev-rebuild-ndk.sh
    DEV-SCRIPTS-USAGE.TXT
    dev-system-import.sh
    download-toolchain-sources.sh
    find-case-duplicates.sh
    gen-platforms.sh
    gen-system-symbols.sh
    gen-toolchain-wrapper.sh
    make-release.sh
    make-standalone-toolchain.sh
    ndk-ccache-g++.sh
    ndk-ccache-gcc.sh
    ndk-common.sh
    package-release.sh
    patch-sources.sh
    prebuilt-common.sh
    rebuild-all-prebuilt.sh


**ndk开发文档**

**各android平台的lib库和头文件库**

头文件库就是android平台提供给我们的可用系统库
大部分头文件和Linux下的头文件和lib库并无差别，新增了android目录

**各平台下预编译的gdbserver(用于android远程调试用，有空要学习一下)**

**一些示例代码**

- bitmap-plasma
- gles3jni
- hello-gl2
- hello-jni
- hello-neon
- HelloComputeNDK
- module-exports
- MoreTeapots
- native-activity
- native-audio
- native-codec
- native-media
- native-plasma
- san-angeles
- Teapot
- test-libstdc++
- two-libs

这些代码都可以作为学习参考


**一些android库的源码**

# **compiler-rt库** #

	是llvm需要用到的runtime库

# **cpufeatures库** #

	主要提供这几个API函数

```C++
    获取CPU个数
    extern int android_getCpuCount(void);
    沙箱进程中使用：强制设置cpu个数和feature
    extern int android_setCpu(int  cpu_count, uint64_t cpu_features);
    调用CPUID
    extern uint32_t android_getCpuIdArm(void);
    extern int android_setCpuArm(int cpu_count, uint64_t cpu_features, uint32_t cpu_id);
```

# **crazy_linker** #

是android下的一个动态链接器，要了解有啥用，先要了解一下linux下程序的加载机制，
[http://jzhihui.iteye.com/blog/1447570](http://jzhihui.iteye.com/blog/1447570)

它跟windows下的PE加载有一些区别

ELF格式分为几种：

relocatable file 可与其他obj文件一起链接生成可执行文件(**类似EXE**)或动态链接库(**类似DLL**)

executable file 可执行文件(**类似EXE**)

shared object file 动态链接库(**类似DLL**)

根据是否引用其他动态库，可以把可执行文件分为两类：静态链接(**不使用其他动态库，相当于在windows下一个EXE不引用任何DLL一样**)、动态链接(**使用了其他动态库**)

内核对可执行文件的加载过程

1. 内核先加载elf到内存
2. 扫描elf的interp段(**解释器段，就是一个字符串路径，用来指定一个动态链接器，Linux下一般是/lib/ld-linux.so.2，android下一般是/system/bin/linker**)
3. 通过调用load_elf_interp将"动态链接器"加载到进程，并修改elf的入口为加载器
4. 启动线程，执行新的elf入口，如果存在interp段，一般elf入口就是"动态链接器"的入口
5. 加载器将所依赖的动态库加载到进程空间

要了解动态链接库(类似DLL)怎么加载，先了解这几个概念

**Global Offset Table（GOT）**

动态库中的重定位表(动态库绝大部分代码都是可重定位的，编译器把绝对地址引用放在一起，构成了GOT)，一般是由"动态链接器"负责修改

**Procedure Linkage Table（PLT）**

对于设置了惰性加载的动态库，它还有PLT表，与其说是表不如说是一堆桩代码，它用来做惰性加载，例如PLT中一条：

    080482bc <puts@plt>:  
    80482bc:   ff 25 78 95 04 08   jmp *0x8049578  
    80482c2:   68 10 00 00 00  push$0x10  
    80482c7:   e9 c0 ff ff ff  jmp 804828c <_init+0x18> 

它是puts函数的桩代码，puts函数在libc库中，第一条指令中的0x8049578位于GOT中，第三条指令的804828c其实指向_dl_runtime_resolve函数，

**原理介绍完了，现在看一下crazy_linker有啥特点**

1. 支持动态修改lib搜索路径，system linker只能搜索LD_LIBRARY_PATH，启动时就定死了，crazy_linker支持运行时添加路径，这可以解决几个问题：调整动态库的加载顺序，自定义加载一些系统库（库冲突）
2. 没有lib库的数量限制（系统链接器不支持64个以上的lib库）
3. 可自定义lib库的加载内存地址（系统链接器是随机分配地址）
4. 可从外部文件的指定部分加载lib库
5. 支持多进程共享lib库
6. libdl.so中的函数随便用，dlopen，dlsym函数已经被crazy linker替换

**如何使用crazy_linker?**

crazy_linker是一个静态链接库，不能在java中直接使用，而应该链接到so库中

在Android.mk中加入(引入crazy_linker静态库):

    LOCAL_STATIC_LIBRARIES := crazy_linker

编译crazy_linker静态库

    include /path/to/crazy_linker/Android.mk

在我们代码中
 #include <crazy_linker.h>

# **native\_app_glue** #

NativeActivity的封装


其他就是gcc、llvm的编译工具链


#3.StaticLibrary_Android#

向导生成的代码结构：
![](/images/StaticLibAndroid.png)

最开始编译时，提示找不到clang.exe，然后发现NDK_ROOT环境变量为空，可以设置NDK环境为vs2015安装的ndk的路径，2015的ndk安装在C:\ProgramData\Microsoft\AndroidNDK\android-ndk-r10e

还有一个错误，提示找不到syslimits.h，这个需要从ndk官方文档中拷贝一份到对应目录即可


总结一下，vs2015开发android的优缺点

优点：开发效率高，集成环境好，clang也是加分项
缺点：暂时没找到如何导入现有的ndk工程，以及如何导出生成android.mk