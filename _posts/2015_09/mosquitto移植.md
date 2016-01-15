title: mosquitto移植
date: 2015-09-06 17:24:27
updated: 2015-09-06 17:24:30
tags:
- 消息推送
- windows
- mqtt

layout:
comments:
categories:
permalink:

---

Mosquitto是MQTT3.1开源版本的实现，Mosquitto支持linux、Vista以上windows系统(看了一下代码，是因为它使用了WSAPoll函数，该函数只在Vista以上才有)。
Mosquitto支持websocket接入(编译时开启，同时需要libwebsockets库)，windows下libwebsockets支持最多64个连接

