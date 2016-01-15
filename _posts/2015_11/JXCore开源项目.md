title: JXCore开源项目
date: 2015-11-20 15:51:56
updated: 2015-11-20 15:51:59
tags:
- JXCore

layout:
comments:
categories:
permalink:

---

* **[JXCore框架](#JXCore框架)**
* **[windows下编译](#windows下编译)**


# JXCore框架
jxcore是一个跨平台的node.js集成框架

# windows下编译
windows下的编译脚本是vcbuild.bat，他有这些编译选项:
debug
release


vcbuild.bat release x86 noetw noperfctr --shared-library --compress-internals


vcbuild.bat里调用了python configure生成vs工程
SET VCVARS_VER=120
set GYP_MSVS_VERSION=2013
python configure --without-etw --without-perfctr --openssl-no-asm --dest-cpu=ia32 --tag= --win-onecore --shared-library --compress-internals
