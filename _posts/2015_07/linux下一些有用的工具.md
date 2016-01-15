title: linux下一些有用的工具
date: 2015-07-10 17:36:13
updated: 2015-07-10 17:37:06
tags:
- linux
- 网络

layout:    
comments:
categories:
permalink:

---

#1.arpspoof(ARP欺骗：中间人攻击)
redirect packets from a target host (or all hosts) on the LAN intended for another local host by forging(伪造) ARP replies. this is an extremely effective way of sniffing traffic on a switch. kernel IP forwarding (or a userland program which accomplishes the same, e.g. fragrouter :-) must be turned on ahead of time.

场景如下：
在一个LAN中，A、B为主机，R为路由器。常规情况下：
A所有外发TCP数据都先经过R转发。
A所有接收TCP数据都由R转发给自己。

**B want to sniff A outbound traffic**
B周期性向A发送arp欺骗response包(告诉A，我是R)
A发送给R的数据发送给了B，由B转发给R

**B want to sniff A inbound traffic**
B周期性向R发送arp欺骗response包(告诉R，我是A)
R发送给A的数据发送给了B，由B转发给A

#2.dnsspoof(DNS劫持：中间人攻击)
forge replies to arbitrary DNS address / pointer queries on the LAN. this is useful in bypassing hostname-based access controls, or in implementing a variety of man-in-the-middle attacks (HTTP, HTTPS, SSH, Kerberos, etc).
可以发送欺骗响应包(DNS请求:给伪造的IP; DNS反查请求:给伪造的host)
跟其他一些DNS劫持原理不一样
使用libpcap监控所有DNS请求，请求需要被劫持时，构造response包

#3.tcpkill(TCP连接断开)
kills specified in-progress TCP connections (useful for libnids-based pplications which require a full TCP 3-whs for TCB creation).
原理很简单:发送一个伪造的FIN/RST包即可

#4.tcpnice(TCP连接限速)
slow down specified TCP connections via "active" traffic shaping. forges tiny TCP window advertisements, and optionally ICMP source quench replies.
使用libpcap监控所有TCP数据包，并伪造一个精心构造的tiny TCP window包，改变其TCP滑动窗口。
或者使用libpcap发送伪造的ICMP source quench(源冷却)响应消息，来降低速度
维基百科对[source quench](https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Source_quench)定义
**Source quench**
Source Quench requests that the sender decrease the rate of messages sent to a router or host. This message may be generated if a router or host does not have sufficient buffer space to process the request, or may occur if the router or host buffer is approaching its limit.

#5.webmitm(http、https透明代理)
HTTP / HTTPS monkey-in-the-middle. transparently proxies and sniffs web traffic redirected by dnsspoof(8), capturing most "secure" SSL-encrypted webmail logins and form submissions.
支持http、https的透明代理服务器

#6.iptables
Linux下网络过滤大神器，内置到Linux内核中，支持各种复杂配置，例如ipforward nat等
