title: slirp介绍
date: 2015-08-27 19:00:11
updated: 2015-08-27 19:00:14
tags:
- 网络
- NAT
- 虚拟化

layout:
comments:
categories:
permalink:

---

# What is a SLIP Emulator?
slirp是一款代理软件，你可以使用SLIP(PPP)协议与它通信、通过它连接Internet。简单说：就是一个上网代理服务器.
slirp其实与lwip类似，是一个带TCP/IP协议、同时还带PPP、SLIP协议的软件，上面可以做网络虚拟，网络转发等功能
Linux下，任何设备都是文件句柄，任何设备读写都是

TCP/IP emulator which turns an ordinary shell account into a
(C)SLIP/PPP account.  This allows shell users to use all the funky Internet
applications

# Is SLiRP better as SLIP or PPP? or, what is the difference between them anyway?
slirp支持slip、cslip、PPP三种协议，三种协议有如下特性：
slip协议：在两个控制字符之间(开始字符、结束字符)放一个原始IP帧，若帧中有控制字符，需要转义
cslip协议：在slip基础上增加了压缩机制，在IP帧头添加了压缩级别，从而使IP帧体积减小，modem中一般使用V.42bis压缩算法
ppp协议：点对点协议，他将IP帧包装成新的packet，新的packet增加了CRC校验，底层通过CRC校验可以删除无效帧，同时增加了一些安全特性，比slip、cslip更加稳定
当使用slirp程序时，cslip模式性能最好，我一般用PPP over cslip

# Slirp Features

* 使用BSD4.4 TCP/IP代码，slow start(慢启动),
  congestion avoidance(拥塞控制), exponential back-off(指数退避算法), round-trip-time calculation,
  delayed ACKs, Nagle algorithm(小TCP包缓存，减少流量), incoming and outgoing IP fragments等特性都支持

* PPP-2.2代码.

#Unpacking and Compiling Slirp

解压代码，执行./configure
make

# Running and Quitting Slirp

~/bin/slirp
~/bin/slirp -P (for PPP)
一旦运行slirp，你的shell account就成为SLIP/PPP账号，所有用语连接SLIP、PPP的方法都可以用于连接slirp


# Slirp Special Addresses
10.0.2.xxx为slirp中特殊地址

* 10.0.2.0
slirp中on-line配置地址，当你telnet到10.0.2.0，你可以关闭连接，配置slirp，重定向端口等

* 10.0.2.1
slirp用这个地址来执行程序，例如：slirp服务端执行add exec /bin/ls:23，当client连接到10.0.2.1:23后，slirp会执行/bin/ls命令并重定向输出到这个连接，即client获取/bin/ls的输出、另一个例子：add exec /path/to/nntpd:119，然后client端就可以连接10.0.2.1浏览新闻了
**相当于一个程序重定向功能**

* 10.0.2.2
slirp服务器内部地址，当你连接10.0.2.2时，你相当于连接到slirp服务器

* 10.0.2.3
DNS服务器内部地址，slirp会将所有的发向10.0.2.3的数据重定向到真正的DNS服务器，所以client端需要将DNS指定为10.0.2.3

* 10.0.2.15

# Configuring Slirp
slirp可以通过三种方式配置：
* 命令行参数
* 配置文件，配置文件在~/.slirprc
* 连接到10.0.2.0，发送命令动态配置

.slirprc文件：
>redir 5022 21
redir X

命令行：
>slirp "redir 5022 21" "redir X"

命令行:
>slirp -P -b 14400

可以改为.slirprc配置文件：
>-P
-b 14400

文件.slirprc中:
>-P
-b 14400
redir 5022 21

命令行下:
>slirp -P -b 14400 "redir 5022 21"


# Slirp Commands

支持slirp命令行参数、telnet 10.0.2.0后输入命令

# Port redirection

redir 配置端口映射，例如：
>redir 5555 21

连接到slirp 服务器的5555端口连接都重定向到你电脑的21端口

>redir udp 2213 2213

slirp服务端的udp 2213端口映射到你电脑的2213端口

# Common Port Redirections

YOUR_PC_ADDRESS是你本机IP地址，默认10.0.2.15
>redir udp 2213 YOUR_PC_ADDRESS:2213

# Connecting a LAN over Slirp

slirp支持多个host连接网络
建立LAN，为每个主机设置IP地址（可以设置到10.0.2.xxx网段），告诉LAN上机器默认网关为通过slirp连接到internet的主机
                           [Ethernet]
        -------------------------------------------------
           |         |         |         |         |
        [Host A]  [Host B]  [Host C]  [Host D]  [Host E]
           |                                       |
           |                                       |
           | <- Slirp link                         | <- SLIP link
           |                                       |
           |                                       |
      [Remote Host]                           [Another LAN]
           |
          ... to the Internet

Now, in this diagram, Host A is the Slirp-connected host.  Host's B through
to E can also access the 'Net by simply using Host A as the gateway.  Host A
also must be told to "forward" IP packets (using Remote Host as the gateway)
so that it will send any IP packets not destined for itself to Slirp, and
vice versa (route all packets sent by Slirp, not destined for itself, back
to their respective host's IP).

In other words, the Slirp link is just like a real SLIP/PPP link, which is
what I've been telling you all this time! :)

Note that it is possible to hook up many LAN's to the 'Net by simply
following the normal Internet conventions, and route the packets properly.
In this case "Another LAN" would use Host E as a gateway to the 'Net, Host E,
provided it can forward IP packets, will send them to it's gateway, Host A,
which will send it over Slirp, etc.  In theory, you could connect another
whole Global Internet to the current Internet with no IP address clashes.
Not recommended though :)


# Load Balancing

Load-balancing is the ability to use more than one network interface (modem)
at the same time, and sending traffic over both in such a way as to
effectively double the throughput (actually, it will "concatenate" the
number of modems to one).  So, for example, if you have a 28.8k modem, and a
14.4k modem, your throughput will effectively be 28.8+14.4 = 43.2k.

Obviously, you need more than one modem, and the same amount of phone
lines.  You also need a TCP/IP stack that can handle more than one
interface (modems).  Linux and FreeBSD have no troubles here, but stacks
like Trumpet Winsock I don't believe would work, since they can only use one
modem at a time.

Slirp is flexible enough to be able to load-balance over multiple hosts.
For example, you could have two accounts with two different ISP's (Internet
Service Providers) and still load-balance over them.


# Compiling Slirp for Load-balancing
---------------------------------------

First you must compile into Slirp the ability to have use Load-balancing.
To do this, edit config.h (after running ./configure) and go to the lines:

#define MAX_INTERFACES 1
#define MAX_PPP_INTERFACES 1

Change the "1" for MAX_INTERFACES to the MAXIMUM number of interfaces
(modems) you expect to have at connected once.  If you plan to use PPP while
load-balancing, you should set MAX_PPP_INTERFACES to the same number as
MAX_INTERFACES.  Once you've changed these values, (re)compile Slirp.


10.3 Setting up your Configuration Files
---------------------------------------

Each modem (or "unit") needs to have it's own unit number, and it's own
configuration file called ~/.slirprc-N, where N is it's unit number.  When
Slirp is run for just one modem, it is assigned unit number 0, so the first
time you run Slirp (or if you plan to use link-resumption as per Section 11,
"Link-resumption") it will read the file ~/slirprc-0.  This file must hold
modem/SLIP/PPP-specific configuration (except MTU and MRU!).  You shouldn't
have any general commands in there like "redir" or "add exec", they go in
~/.slirprc.

You must also put the "socket" command in your ~/.slirprc file.  If all
connections are on the same host with the same account, you should simply
put "socket" in your ~/.slirprc file.  If on the other hand you have
different account, possibly on different hosts, you should put the following
in your ~/slirprc file:

socket PORT,PASSWORD

where PORT is an arbitrary port number for Slirp to listen to (must be
greater than 1024), and PASSWORD is the password to use when connecting.
This is explained in Section 10.4, "Connecting More Modems".

E.g., if your ~/.slirprc currently looks like:

redir 5000 21
baudrate 57600
ppp
socket
ipcp-accept-remote
mtu 552
mru 552

Then you should make your config files look like the following:

~/.slirprc:
redir 5000 21
socket
mtu 552
mru 552

~/.slirprc-0
baudrate 57600
ppp
ipcp-accept-remote

(Note: mtu and mru go into ~/.slirprc even though it is a modem-specific
command, they are the only exceptions to the rule)


10.4 Connecting More Modems
---------------------------

Once you have the config files and interfaces ready, you connect all your
modems to the same shell account as the same user.  The first Slirp that you
run should be run normally, as "slirp" (this is unit 0, the "main" Slirp).
If all connections are from the same host and the same account (you have
"socket" in your ~/.slirprc file),  then for each other connection, you run
subsequent Slirp's as "slirp -l UNIT", where UNIT corresponds to that
connection's ~/.slirprc-UNIT file.  If in the other hand you are connecting
from multiple accounts and/or multiple hosts (I.e. you used a command of the
form "socket PORT,PASSWORD" in your ~/.slirprc file) then you run subsequent
Slirp's as "slirp -l UNIT,HOST:PORT,PASSWORD", where UNIT corresponds to
that connection's ~/.slirprc-UNIT file, HOST is the address where the main
Slirp (unit 0, as described above) is running, and PORT and PASSWORD
correspond to those used in the "socket" command.  The reason for a password
is so that others who connect to this port are not allowed to send anything
to Slirp, which would be a major security hole.

Note that you can also pass Slirp the password using the environmental
variable SLIRP_PASSWORD (this is for hosts which do not properly delete the
password from the argument list).  In this case, simply use "slirp -l
UNIT,HOST:PORT,-" instead.  The "-" tells Slirp the password is in the
environmental variable.

The -l option MUST be the only command given to all subsequent Slirp's.  If
there are other commands after it, they will be ignored.  If there are other
commands before it, it will not work. If it succeeds, you should get a
message like "Connected: Attached as unit N on device D".  Once you get this
message, you can tell your local SLIP/PPP software to make the connection
(you should make all interfaces have the same IP address).


You can attach and detach modems as you wish.  For example, you could be
running Slirp as unit 0 as usual, then when you feel like it, you dial-in
with your second modem and attach it while all the connections are still
active.  They will all continue as normal.

You can also detach each unit as you wish, by typing 5 ones ('1') into the
unit you wish to be disconnected (remember, sending 5 zeroes ('0') will kill
ALL the unit's and all running Slirp's).  When all unit's are disconnected,
Slirp will sit in the background and wait.  If you do not re-attach a new
unit in 10 minutes, Slirp will exit.


10.5 Load-balancing Notes
-------------------------

* There are no limits to how many modems you can attach to one running Slirp.
If you have 12 modems, Slirp will slurp them all up! (lucky you! :)

* You MUST use the same MTU/MRU on all interfaces (and hence MTU/MRU should
only be in ~/.slirprc).  This is the only *real* limitation when using
load-balancing.  It is needed because of the way Slirp allocates data
(mbufs) and the fact that at the TCP/UDP layer, Slirp does not yet know over
which interface it is going to send the data, and so it can't tell how big
the packet is allowed to be. I suppose I *could* lift this restriction, but
I don't wanna :) (I don't think the extra code justifies the *small* gain).
You should also try and keep both MTU and MRU the same.

* Because SLIP is dumb, you should be careful when attaching a new SLIP
unit.  As soon as you attach the new unit, Slirp will start sending data
over it.  Try and attach it quickly, and keep traffic to a minimum when
attaching.  PPP on the other hand does not suffer from this, since it will
not be active until the two ends negotiate all options etc. and mark the
interface as "up".

* Do NOT use vj compression any ANY of the interfaces when using more than
one link.  It will not work, period.

* You can mix SLIP/PPP interfaces in whatever way you wish. E.g.: have 2
modems using PPP and 1 modem using SLIP.

* The load balancing is implemented before the network, ip, layer:

  tty1 -- slip unwrap -\                       + icmp ---- udp emulation
                       +---- ip processing ----+ udp  ---- udp socket
  tty2 -- ppp unwrap  -/                       + tcp  ---- tcp socket

As a result, the maximum datalink layer frame length, MTU/MRU, for all
connections must be the same and no compression of any kind is possible.


10.6 Tuning the Connection
--------------------------

The two variables Slirp uses to determine the ratio of data which should go
to each unit is the "baudrate" and "towrite_max", as given to it via the
~/.slirprc* files (baudrate is per-unit, towrite_max is the same for all
units).

The "baudrate" should be the maximum theoretical throughput on that modem,
and, more importantly, each unit should be given a baudrate which is
reflective of it's performance relative to the other units.  I.e., the ratio
of any 2 "baudrate"'s on any 2 units should be the same as the ratio of the
2 modems actual baudrate. E.g.: if you have 2 modems that are the same
speed, the "baudrate" should also be the same.  Or, if one modem is twice as
fast as the other, then the baudrate should also be twice as fast as the
other, etc.

Note: play around with the baudrates to get the best results.  Sometimes,
depending on the type of data, setting the baudrates to the actual CONNECT
speed can improve performance.

The "towrite_max" option tells Slirp the minimum number of bytes it will
write to each modem before it "backs off" and starts baudrate calculations.
Why is this important?  Resolution.  If towrite_max is only 1, then each
modem will be either "ready" or "not ready" with nothing in between; nothing
to determine which modem has been written to the most recently.  Conversly,
if you have towrite_max at 20k and you have a 2400 baud and a 28.8k baud
modem, then Slirp will write 20k to each modem before "backing off" and
doing any calculation.  This means the 2400 baud modem will have 20k of data
sent over it, no matter what the situation, which is obviously wrong
(consider sending a 40k file; the load will be equally shared between the
two modems, which is obviously wrong).

In general, "towrite_max" should be higher for faster modems.  E.g., I'd
recommend 2048 when load-balancing over 28.8k modems.

So basically, it comes down to this: the "baudrate" determines how to share
the data between the modems, the "towrite_max" determines when to start
calculating the load share.  There is no set formula to determine what these
should be, since a lot of it is determined by the nature and type of data
being sent over the modems.  Use these suggestions as a guide, but there's
no substitute for good'ol trial-and-error.

During the initial tests, one tester regularly acheived 6.6k/sec with 2
modems connected at 31.2K.


11. Link-resumption
===============================================================================

11.1 What is Link-resumption?
-----------------------------

Link-resumption is the ability to resume all connections even if the modem
gets accidently (or deliberately) disconnected.


11.2 How do I use Link-resumption?
----------------------------------

To be able to resume a connection you first need to setup your configuration
files similar to when using Load-balancing.  See Section 10.3, "Setting up
your Configuration Files [for Load-balancing]" to see how to setup your
~/.slirprc-0 file.

Once the configuration files are setup, all you need to do is always run
Slirp as "slirp -l 0".  Do NOT include the "-l 0" in your ~/.slirprc file,
it MUST be on the command line.  You can run Slirp like this even if there
is no link to be resumed, Slirp will run as normal in that case.

Also, remember that sending 5 1's down the line will detach only the current
link.  This allows you to do funky things like detach the current PPP link,
then re-attach it as a SLIP link, without disturbing any of the current
connections.

Note that if you do not resume your disconnected link within 10 minutes,
Slirp will exit.


12. Technical Information about Slirp
===============================================================================

12.1 Which programs do not work over Slirp?
-------------------------------------------

Any programs that bind()'s a port, then tell the other end of the connection
where they should connect() to this bound port.

For example, when you "get" a file during an FTP session, the FTP client
bind()'s a socket, has a look at which port the socket is bound to, then
tells the FTP server the address and port of this socket (with the PORT
command). The FTP server then connect()'s to this address/socket pair.

Now, since your machine isn't really on the Internet, this connect() request
will not arrive to your host, so it will not work.

Slirp emulates this by bind()ing it's own port on the server that *is* on
the Internet, and tells the FTP server about *that* address/socket pair.
When the server connect()'s to it, Slirp will then connect back to your
machine.

At present, the following programs are emulated:
    rlogin
    ftp
    ksh
    irc (for /dcc)
    RealAudio
    talk/ytalk/ntalk
    CUSeeMe


13. Troubleshooting
===============================================================================

Symptom
-------
 The connection will "freeze".  E.g., while downloading a picture on WWW it
 will stop halfway and no connections will continue.
Diagnosis
---------
 You probably don't have an 8bit clean link.
Cure
----
 You should try and find out from your sysadmin which characters need to be
 "escaped", then tell Slirp about them using the "asyncmap" and "escape"
 commands.  Note that you need to use PPP for this to work.  (One way to
 test for 8bit cleanliness is to download a BINARY file with Z-Modem.  If the
 file doesn't make it, you have a "dirty" link)

 One thing you might try is run Slirp as:

 slirp "asyncmap ffffffff" "escape ff"

 (quotes included!)  This will tell Slirp to escape the most common "nasty
 characters.


Symptom
-------
 You can connect to hosts using numerical addresses (of the form
 aa.bb.cc.dd) but you cannot connect to hosts when you use their hostname
 (E.g.: ftp.cdrom.com).  It usually times out with a DNS error.
Diagnosis
---------
 You probably did not set your DNS address properly.
Cure
----
 Try setting your DNS address to 10.0.2.3.  This should work for most
 situations.  If that fails, go to your shell prompt and type "nslookup".
 This should print the address and hostname of your DNS server.  Use the
 numerical IP address as your DNS.  Do NOT use the hostname.

 If you still can't find your DNS address, ask your sysadmin for it.


13.1 Other Troubleshooting Hints
--------------------------------

1.  Try turning down, or off the optimizer on the compiler.

2.  Try compiling with the -DDEBUG option enabled, and running with
    debugging, and ppp debugging enabled.

    eg. slirp -P -d -1 debugppp

    This will generate the files slirp_debug, and slirp_pppdebug which
    may have useful information in them. (Note: The options are parsed
    fairly late in the startup procedure, so some stuff which would
    appear to be logged isn't)

    ** Update ** You can now turn on debugging early, by uncommenting
    the line in main.c In which case you should not put the -d -1 on the
    command line. (It causes the file to be opened again later,
    overwriting all the early stuff)

3.  CYGWIN
    There is a stacktrace.sh shell script that will give you the location
    slirp crashed, if it crashes.


14. Answers to Frequently Asked Questions (FAQs)
===============================================================================

Q1.  Can I use Slirp through Telnet or Rlogin?

A1.  Yes, usually.  But this is highly dependent on your situation.

     The reason Slirp usually doesn't work through telnet is because of the
     ^] character is interpreted by the telnet client, and 0xff interpreted
     by the server.  While you can tell Slirp to escape these characters
     while using PPP, it may not be possible to get your local PPP software
     to escape characters greater than ASCII 31.  Rlogin also interprets the
     ~ character, which may interfere with PPP (especially considering ~ is
     ASCII 0x7e which is used by PPP as the "end of packet" character").

     If your PPP software is unable to escape these characters, or you're
     using (C)SLIP (which must have an 8bit clean link), your best bet is to
     try and make the link 8bit clean.  For example, on some systems you can
     give telnet the -8 flag to make the link 8bit, and -E to stop it from
     interpreting the ^] character.  Similarly for rlogin; -8 to make the
     link 8bit, -E to stop rlogin from interpreting the ~ character.  You
     should look at the telnet and rlogin manual pages ("man telnet" and
     "man rlogin" respectively) to see if your telnet/rlogin has similar
     options.

     Another possible solution is to use Slirp's ability to work over
     multiple hosts.  See Section 10, "Load-balancing" for details on how
     to disconnect/reconnect Slirp sessions using Internet-domain sockets.


Q2.  How do I run an X program on another host and have it display on my PC?

A2.  Use the "redir X" command in ~/.slirprc.  This will redirect a port for
     use with X programs.

     On startup, Slirp should print something like:

     X Redir: In sh/bash/zsh/etc. type: DISPLAY=IP.ADDRESS:X.Y; export DISPLAY
     X Redir: In csh/tcsh/etc. type:    setenv DISPLAY IP.ADDRESS:X.Y

     Now, when you telnet to the host you wish to run the X programs from,
     you should do as Slirp suggest above; type either of the two commands,
     depending on which shell you are using.  You could also run the X
     program as "xprog -display IP.ADDRESS:X.Y" as printed above.

     If you missed what Slirp displayed on startup, you can telnet to
     10.0.2.0 and give Slirp the command "show X", and the above will be
     printed.

     Note that you also have to make sure your X server will accept the
     connection.  See the man page for xhost and Xsecurity.  Be careful with
     issuing commands like "xhost +", this will allow anyone to connect to
     your X server and do basically anything they want.


Q3.  When I run "talk" or "wintalk", etc. I am able to send requests to
     other people but they cannot send requests to me.  Why?

A3.  You won't be able to receive talk requests, period.  This is because
     Slirp never see's the incoming talk request; it is sent directly over
     the modem, most likely corrupting any incoming packet with it (which
     will have to be retransmitted).  Slirp turns off your messages so the
     person who tries to talk to you should receive a "User is refusing
     messages" error.


Q4.  I can't telnet to 10.0.2.0, the Slirp control address.  What's wrong?

A4.  Your TCP/IP stack probably has a problem with addresses ending in 0.
     Edit the file ctl.h in the "src" directory and change the 0 in the
     line:
     
     #define CTL_CMD         0

     to something else, say 10.  Then you "telnet 10.0.2.10" to get the
     Slirp command-line.


Q5.  I'm having a few problems with Slirp and want to try and find the
     problem myself.  Does Slirp have any debugging facilities?

A5.  Yes.  After you type ./configure, edit Makefile and uncomment the
     -DDEBUG argument in the COMMON_DEFS section.  I.e. the line:

     COMMON_DEFS =  -I. -I${srcdir} -DUSE_PPP #-DDEBUG

     should look like:

     COMMON_DEFS =  -I. -I${srcdir} -DUSE_PPP -DDEBUG

     and recompile.  Then, simply give Slirp the arguments "-d -1" and Slirp
     will log lots of stuff to a file called slirp_debug.  Level -1 logs the
     most.


Q6.  My ISP logs me out if I idle too long.  How can I get Slirp to prevent
     this?

A6.  First of all, the idle-logout mechanism is used for a reason: to
     prevent people from hogging a modem which is not in use.  So if you're
     idle, logout and give others chance to use the modem.

     Having said that, you can make Slirp use TCP keep-alive timers to
     regularly probe each TCP connection.  To activate this, add:
     
     keepalive
     
     to your ~/.slirprc file.  This will make Slirp probe each TCP
     connection every minute or so.  You can change this interval by giving
     keepalive the number of seconds:
     
     keepalive SECONDS

     Note that no probes will be sent if there are no TCP connections.  So
     you need at least one active TCP connection for this to work.


Q7.  When I ftp to a non-standard port (like when another Slirp user is
     redirecting a port for their ftp server on their PC) it doesn't work.
     Why?

A7.  You need to tell Slirp about the non-standard port by issuing the
     command: 

     add emu ftp PORT
     
     where PORT is the port you are ftping to.  The same goes for other
     emulated services.

