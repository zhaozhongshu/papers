title: 使用命名扩展来扩充explorer的功能
date: 2015-09-02 23:29:03
updated: 2015-09-02 23:29:06
tags:
- windows
- shell

layout:
comments:
categories:
permalink:

---

[原文链接](http://www.microsoft.com/msj/archive/S332.aspx)
在windows explorer中，可以通过使用"name space"向explorer添加分层数据结构，"name space"包含在explorer面板上显示的对象，一个name space就是一组符号，例如：一组database keys、文件、目录等。
在shell中，使用一个层次结构的name space管理所有对象，如：文件、存储设备、打印机、网络资源以及其他一些可以在explorer中被显示的资源，根节点就是windows desktop，同文件系统目录结构类似，name space可以包含除文件、目录外的其他资源。

我们可以实现一个name space扩展，来添加自定义数据，如何在explorer中查看自定义数据，例如，可以实现一个扩展查看zip文件里的子文件

举个例子，Cab File Viewer使用name space扩展让explorer可以浏览cab压缩包里面的文件

# What is the Shell Name Space?
Windows 95 and Windows NT 4.0 use a data structure-the name space-that represents the hierarchy of objects all the way from the desktop to every item that can be seen in Explorer. From the desktop you can view Network Neighborhood, My Briefcase, Recycle Bin, and My Computer. From My Computer you can get to drives, Control Panel, Printers, and Dial-Up Networking. Look at the left pane of Explorer to see the hierarchy of objects clearly. These items are called virtual folders-virtual because they refer to items in the name space that can contain other name space items, as opposed to groups of files.

Explorer uses COM interfaces to let the user access and manipulate internal name space data and to display it in a graphical form. In the COM paradigm, you are supposed to manipulate and extend the internal name space structures using COM interfaces instead of directly accessing the name space data.

You may have already noticed that the [EnumDesk](http://www.codeproject.com/Articles/4105/Enumdesk-Clones) sample from the MSDN CD and the Windows Explorer look almost exactly the same. This is because both Explorer and EnumDesk walk though the name space and display the information in the name space. Both Explorer and EnumDesk call into the name space to enumerate the contents of a folder. They can then step through the items in the folder and call another interface to find out what to display. I will go through these steps in more detail later in this article.

# Types of Name Space Extensions
There are two high-level topics to discuss on name space extensions before I jump into the details: rooted versus nonrooted name space extensions and the point of entry.

The difference between rooted extensions and nonrooted extensions is how they're used. There is no code difference between the two. A rooted extension is meant to stand alone. Essentially, the extension is the root of the tree and can only see its own branches. To see an example of a rooted extension, right-click on the Windows 95 taskbar, choose Properties, click the Start Menu Programs tab, and click the Advanced button. You will see an Explorer-like window with the Start Menu folder as the root, as in Figure 1. In the case of the Cab File Viewer (see Figure 2), it is also a rooted extension, since the window shown does not let you step backwards to the CAB file.
![](/images/shellext1.gif)
Figure 1 Rooted name space
![](/images/shellext2.gif)
Figure 2 CAB File Viewer

A nonrooted use of a name space extension keeps the entire name space in mind. Right click on the Windows 95 Start button on the taskbar and select Explore from the pop-up menu. In this case, the exact same name space extension is shown in an Explorer window (see Figure 3), except you can step back from the Start Menu folder and traipse around the rest of the name space.
![](/images/shellext3.gif)
Figure 3 Nonrooted name space

The implementation of the name space extension is basically the same for both kinds. Which method you use depends on your extension and is a matter of style and common sense as much as anything else.

Now let's talk about entry points. The root, or top level, of your name space is referred to as the junction point. In the case of the Cab File Viewer, the junction point is the CAB file itself. There is a restriction in the current Explorer-any name space that is implemented with a file (like CAB) as its junction point must be rooted, since the Explorer does not support exploring directly into files.cab文件本身就是跳转点

An alternative is to use a directory as the junction point. To do this, you must create a directory, change the directory's attributes to read-only, and place a file called Desktop.ini into it. This INI file then specifies the CLSID of your extension:目录作为跳转点(放一个desktop.ini)
> [.ShellClassInfo]
>CLSID={CLSID}

You can place an entry point on the desktop or in the My Computer folder in several ways. First, you can put information in the registry that results in an icon being placed on the desktop, the icon coming from the CLSID in this registry entry:
**放一个图标到桌面上**
> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\
Explorer\Desktop\Namespace\{CLSID}\(default) = 
     "Description of my extension"

This is what you'd use to place the icon in the My Computer folder:
**放一个图标到我的电脑上**
> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\
Explorer\MyComputer\Namespace\{CLSID}\(default) =     
     "Description of my extension"


So should you implement a rooted or nonrooted extension? And should the entry point be on the desktop or somewhere else? It depends on your extension. Does your extension fit into the logical hierarchy of the name space? Does it make sense to move up a level in the hierarchy from your name space? If not, a rooted extension may make more sense.

Suppose you are implementing an extension to browse Usenet newsgroups. Does it make sense to have more than one entry point? Not really, so an entry point on the desktop seems reasonable. What about rooting? You could argue either way, but I would think that it should be rooted. What if you wanted to browse into a database file of some sort? Well, since it's reasonable for more than one to exist on your machine, it makes sense to use the location of the file itself as the entry point. As for rooting, if you use the file as the junction point, a rooted extension is your only option.

# Registering the Extension
Like all shell extensions, a name space extension is registered in the Windows registry so that Explorer can determine its location and what services are available.

Here's the basic layout and options for the registry. First, if you are registering a file type to be treated like a name space extension, you need:

> HKEY_CLASSES_ROOT\.EXT\(default)=CLSID\{CLSID}  ; 

This is only necessary if you are registering an extension for a specific file.

The rest is similar to other shell extensions,
> HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\InProcServer32\(default) = "C:\\WINDOWS\\SYSTEM\\ShellExt\\CabView.dll"

and
> HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\InProcServer32\"ThreadingModel" = "Apartment"

The Cab File Viewer registers the extension under the file extension for CAB files, similar to the way you register context menu handlers, property sheet extensions, and other shell extensions.

> HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}

Next, the following entries are added. Note the reference to the CLSID for the CabView.dll and the rooted Explorer.

> HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\InProcServer32\(default)= "C:\\WINDOWS\\SYSTEM\\ShellExt\\CabView.dll"
HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\InProcServer32\"ThreadingModel" ="Apartment"
HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\DefaultIcon\(default)= "C:\\WINDOWS\\SYSTEM\\ShellExt\\CabView.dll"
HKEY_CLASSES_ROOT\CLSID\{0CD7A5C0-9F37-11CE-AE65-08002B2E1262}\shell\open\command\(default)= "Explorer /root,{0CD7A5C0-9F37-11CE-AE65-08002B2E1262},%1"

Explorer invokes your extension using the exact command line you registered, so you can test your command line by executing it directly with the Run command on the Start menu. For example, executing

 Explorer.exe /root, {your CLSID}, [path] 
should start up the Explorer and your extension.

The Difference Between a Shell Extension and a Name Space Extension
Shell extensions are code that modifies or enhances the functionality of the entire operating system shell. Name space extensions are just one type of shell extension. Therefore, all name space extensions are shell extensions. Because of this, there is some standard shell extension code you will need to use when writing your name space extension (which I will cover in a moment).

Let me clear something up. The terms "shell" and "Explorer" are often used interchangeably in some of Microsoft's documentation. This is because Explorer.exe is the entire Windows shell. A shell extension is in fact an Explorer extension. It is confusing because most people think of the Explorer as the window (shown in Figure 5) that explores the name space. Explorer is also the application that owns and controls the desktop and the name space data. When you're implementing a name space extension (or any shell extension), think of the big picture as just a collection of shell extensions, all owned by Explorer. Other parts of Windows 95 system code also use these extensions, including the File Open and File Save common dialogs.

![](/images/shellext4.gif)

Figure 5 Explorer

A name space extension is to Explorer as an interpreter is to a tourist. Since your custom name space data is in a language Explorer does not natively know, your name space extension will translate your custom data to a format that Explorer can understand.

OK, so what's a browser? A browser is an application that interacts with the name space to provide the user with a visual representation and a mechanism to manipulate the data. The EnumDesk sample (see Figure 6) from the MSDN CD is a browser. The Explorer window in Figure 5 is also a browser. The goal of name space extensions is to eliminate the need to write a complete browser.
![](/images/shellext5.gif)