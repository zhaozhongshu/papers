title: 使用asio的常用软件(不定期更新)
date: 2015-07-03 19:44:52
updated: 2015-07-03 19:46:54
tags:
- asio
- 网络

---

有如下著名软件在使用asio(不定期更新)
#Restbed - 
RESTful C++ embedded framework
restful是一种编程风格
Corvusoft's Restbed framework brings asynchronous RESTful functionality to C++11 applications.

#reTurn Server - 
high-performance ICE/STUN/TURN server for SIP, XMPP and WebRTC? media stream relay(防火墙、NAT穿透)
SIP, XMPP and WebRTC? require a TURN server to relay media streams for users on private IP networks. reTurn Server is an open source project that implements the TURN standard.
asio is used for all low-level networking, providing support for UDP, TCP and TLS transports for TURN.

#WebSocket? ++ 
(WebSocketPP? ) - WebSocket? framework
WebSockets? provide a mechanism for messaging passing between JavaScript? clients in a web browser and server side code.
WebSocketPP is a C++ library implementing both WebSocket? client and server functionality. It is an asynchronous application built on top of asio.

#Loggly - 
high-performance cloud-based log aggregation and analytics
http://www.loggly.com
At Loggly we built our high-performance Collectors using the Boost ASIO framework. We found its event-driven model to perform very well, and the framework itself was a joy to code with. You can more details from our blog post.

#Remobo -- 
create your own Instant Private Network (IPN 类似VPN)
http://www.remobo.com/
Remobo allows you to easily creates an Instant Private Network (IPN) between your computers and your friends. It's a COMPUTER network based on your social network circle. With IPN service, you and your friends can work or play together over Internet as if you were sitting on the same office or home LAN (Local Area Network).
Remobo uses Boost and asio libraries for multi-threading, asynchronous socket I/O, and timer. which are the building blocks for our large-scale, fault-tolerant distributed systems. Boost and asio are chosen over other alternative libraries for its portability across multiple platforms like Linux, Mac OSX, and Windows NT/2000/XP/Vista. The simplicity of asio's header-only implementation is also highly appreciated.

#OpenTibia - 
Open Source Emulation of the MMORPG Tibia
http://opentibia.sourceforge.net/
OpenTibia is an open source emulation of the massively multiplayer online RPG; Tibia.
OpenTibia now uses the boost.asio library for asynchronous socket I/O. As with Osiris, it is to allow a single thread to manage many connections simultaneously.

#Osiris - 
Serverless Portal System
http://osiris.kodeware.net
Osiris is a free portal creation software. The portals created with osiris don't need a central server, they are safe, indestructible and anonymous. In those portals, all users have the same rights, so the standard hierarchys (administrators, moderators, members) of regular forums are not present, even if they are supported.
Osiris uses the Boost and asio libraries for multi-threading and asynchronous I/O. Multi-threading allows the use of multiple CPUs or processing cores to process HTTP requests simultaneously. Asynchronous I/O allows each thread to handle many connections simultaneously (otherwise, a single thread would be required for every connection to the server).

#Jet Infosystems, 
SKVT "Dozor-Jet" 网页防火墙
Jet Infosystems, Moscow - one of the leading Russian integrator and manufacturer of network security software. SKVT "Dozor-Jet" is web traffic filtering system, that act as a proxy and perform bidirectional filtering of web traffic - by URL, mime-type, words, time, etc. Description (in Russian) available here.
Software implement process per connection strategy, perform pre-forking of handlers. Asio used both in sync and async mode. Sync mode use for http connections, and async - for https.

#libtorrent - 
BitTorrent library
http://www.rasterbar.com/products/libtorrent
libtorrent is a library that implements a bittorrent client. Asio is used as the main message loop to process, typically, up to 200 tcp connections. It handles all connections in one thread as asynchronous operations.

#libbitcoin - 
Bitcoin library
http://libbitcoin.org/
https://gitorious.org/libbitcoin
https://bitcointalk.org/index.php?topic=30646.0
rewrite bitcoin, make it super-pluggable, very easy to do and hack everything at every level, and very configurable