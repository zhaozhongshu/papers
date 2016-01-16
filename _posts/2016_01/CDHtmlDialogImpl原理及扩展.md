title: CDHtmlDialogImpl原理及扩展
date: 2016-01-16 19:22:23
updated: 2016-01-16 19:22:26
tags:
- C++
- windows

layout:
comments:
categories:
permalink:

---

# CDHtmlDialog简介 #

在MFC中，有这样一个类库：CDHtmlDialog，它可以在win32窗口中嵌入浏览器控件，使用起来挺方便，但是在WTL中，却不带这个类库。
所幸的是，有一个开源项目提供了WTL版的CDHtmlDialog类，http://code.google.com/p/htmlui
主要功能是放在**HtmlDialogImpl.h**中实现的

# CDHtmlDialog简单使用 #

HtmlDialogImpl.h文件提供了两个模板类： **CDHtmlDialogImpl** 和 **CMultiPageDHtmlDialogImpl**
基本使用：
```C++    
    继承CDHtmlDialogImpl类
    class CMainDlg : public CDHtmlDialogImpl<CMainDlg> {...}
    
    初始化，使用
    CMainDlg dlg;
    dlg.m_strCurrentUrl = _T("www.microsoft.com"); 
    dlg.Create(NULL); 或者调用 dlg.DoModal(NULL);
	或者在OnInitDialog函数中，调用Navigate访问资源，例如
	WCHAR wszRes[MAX_PATH] = { 0 };
	GetModuleFileName(NULL, wszRes, MAX_PATH);
	PathRemoveFileSpec(wszRes);
	wcsncat_s(wszRes, MAX_PATH, L"\\skin.dll", _TRUNCATE);
	CString url;
	url.Format(L"res://%s/htm/main.html", wszRes);

	Navigate(url, 0, 0, 0);
```

重写全局文档相关的DWebBrowser2Events事件处理

```C++
class CMainDlg : public CDHtmlDialogImpl<CMainDlg>
{
	virtual void OnBeforeNavigate(LPDISPATCH pDisp, LPCTSTR szUrl)
	{
		// your code is here.
	}
	virtual void OnNavigateComplete(LPDISPATCH pDisp, LPCTSTR szUrl)
	{
		// your code is here.
	}
	virtual void OnDocumentComplete(LPDISPATCH pDisp, LPCTSTR szUrl)
	{
		// your code is here.
	}
}
```

添加IHTMLDocument2Events网页元素事件处理函数
```C++
class CMainDlg : public CDHtmlDialogImpl<CMainDlg>
{
	......
	BEGIN_DHTML_EVENT_MAP(CMainDlg)
		DHTML_EVENT_ONCLICK(_T("elementid1"), OnClick)
		DHTML_EVENT_ONMOUSEMOVE(_T("elementid2"), OnMouseMove)
	END_DHTML_EVENT_MAP()
	HRESULT OnClick(IHTMLElement *pElement)
	{
		// your code is here.
		return S_OK;
	}
	HRESULT OnMouseMove(IHTMLElement *pElement)
	{
		// your code is here.
		return S_OK;
	}
	......
}
```
**直接添加IHTMLElement事件处理函数**(前面的DHTML_EVENT_ONCLICK、DHTML_EVENT_ONMOUSEMOVE事件其实就是DHTML_EVENT宏的进一步封装)
```C++
class CMainDlg : public CDHtmlDialogImpl<CMainDlg>
{
	......
	BEGIN_DHTML_EVENT_MAP(CMainDlg)
		DHTML_EVENT_ELEMENT(DISPID_HTMLELEMENTEVENTS_ONMOUSEOVER, _T("elementid"), OnMouseOver)
		DHTML_EVENT_CLASS(DISPID_HTMLELEMENTEVENTS_ONMOUSEOVER, _T("classname"), OnMouseOver)
		DHTML_EVENT_TAG(DISPID_HTMLELEMENTEVENTS_ONMOUSEOVER, _T("tagname"), OnMouseOver)
	END_DHTML_EVENT_MAP()
	HRESULT OnMouseOver(IHTMLElement *pElement)
	{
		// your code is here.
		return S_OK;
	}
	......
}
```
**我们看一下这几个宏**
```C++
//根据元素name绑定事件
#define DHTML_EVENT(dispid, elemName, memberFxn)\
{ DHTMLEVENTMAPENTRY_NAME, dispid, elemName, (DHEVTFUNCCONTROL) (DHEVTFUNC) &theClass::memberFxn },\
//根据元素class name绑定事件
#define DHTML_EVENT_CLASS(dispid, elemName, memberFxn)\
{ DHTMLEVENTMAPENTRY_CLASS, dispid, elemName, (DHEVTFUNCCONTROL) (DHEVTFUNC) &theClass::memberFxn },\
//根据tag name绑定事件
#define DHTML_EVENT_TAG(dispid, elemName, memberFxn)\
{ DHTMLEVENTMAPENTRY_TAG, dispid, elemName, (DHEVTFUNCCONTROL) (DHEVTFUNC) &theClass::memberFxn },\
///根据element绑定事件
#define DHTML_EVENT_ELEMENT(dispid, elemName, memberFxn)\
{ DHTMLEVENTMAPENTRY_ELEMENT, dispid, elemName, (DHEVTFUNCCONTROL) (DHEVTFUNC) &theClass::memberFxn },\
根据activex控件绑定事件
#define DHTML_EVENT_AXCONTROL(dispid, controlName, memberFxn)\
{ DHTMLEVENTMAPENTRY_CONTROL, dispid, controlName, (DHEVTFUNCCONTROL) (static_cast<void (__stdcall theClass::*)()>(&theClass::memberFxn)) },\

```	
**绑定activex控件的事件回调**
```C++
class CMainDlg : public CDHtmlDialogImpl<CMainDlg>
{
	......
	BEGIN_DHTML_EVENT_MAP(CMainDlg)
		DHTML_EVENT_AXCONTROL(controlMethodDISPID, _T("objectid"), OnControlMethod)
	END_DHTML_EVENT_MAP()
	HRESULT OnControlMethod(IHTMLElement *pElement)
	{
		// your code is here.
		return S_OK;
	}
	......
}
```
**绑定external调用的dispatch回调	**
```C++
class CMainDlg : public CDHtmlDialogImpl<CMainDlg>
{
	......
	BEGIN_EXTERNAL_METHOD_MAP(CMainDlg)
		EXTERNAL_METHOD(_T("about"), OnAbout)  // script calls "window.external.about(123, "abc");"
	END_EXTERNAL_METHOD_MAP()
	void OnAbout(VARIANT* para1, VARIANT* para2, VARIANT* para3)
	{
		// your code is here.
	}
	......
}
```	
**多页面对话框**
```C++
class CMainDlg : public CMultiPageDHtmlDialogImpl<CMainDlg>
{
	......
	BEGIN_URL_ENTRIES_MAP(CMainDlg)
		BEGIN_DHTML_URL_EVENT_MAP(1)	/// map in page1.htm
			DHTML_EVENT_ONCLICK(_T("elementid"), OnClick)
			DHTML_EVENT_AXCONTROL(controlMethodDISPID, _T("objectid"), OnControlMethod)
		END_DHTML_URL_EVENT_MAP()
//
		BEGIN_DHTML_URL_EVENT_MAP(2)	/// map in page2.htm
			DHTML_EVENT_ELEMENT(DISPID_HTMLELEMENTEVENTS_ONMOUSEOVER, _T("elementid"), OnMouseOver)
		END_DHTML_URL_EVENT_MAP()
// 
		BEGIN_URL_ENTRIES()
			URL_EVENT_ENTRY(_T("page1.htm"), 1)
			URL_EVENT_ENTRY(_T("page2.htm"), 2)
		END_URL_ENTRIES()
	END_URL_ENTRIES_MAP()
// 
	HRESULT OnMouseOver(IHTMLElement *pElement)
	{
		// your code is here.
		return S_OK;
	}
	......
}
```

**html网页中控制窗口展示**
在body元素中，可以定义dlg_autosize= true，表示host窗口，可调整大小，否则dlg_width和dlg_height元素有效，规定窗口大小
```C++
<body dlg_autosize="false" dlg_width="600" dlg_height="300">
```

**内置了几个external函数**

```c++
	static const DHtmlExternalMethodMapEntry _dhtmlExtMethodEntries[] = { \
	{ _T("resizeWindow"), (EXTFUNCCONTROL)(EXTFUNC) &theClass::OnResizeWindow },\
	{ _T("centerWindow"), (EXTFUNCCONTROL)(EXTFUNC) &theClass::OnCenterWindow },\
	{ _T("showTitleBar"), (EXTFUNCCONTROL)(EXTFUNC) &theClass::OnShowTitleBar },
```
在js中调用这些函数用来动态调整窗口大小、窗口居中，隐藏显示系统标题栏
window.external.showTitleBar(1);

# CDHtmlDialog的实现 #

CDHtmlDialog类继承了这几个基类：
```C++
template <class T, class TBase = ATL::CWindow>
class ATL_NO_VTABLE CDHtmlDialogImpl :
	public ATL::CDialogImplBaseT< TBase >,
	public CDHtmlEventSink,
	public CExternalDispatchImpl<CDHtmlDialogImpl<T,TBase> >,
	public IDocHostUIHandlerDispatchImpl<CDHtmlDialogImpl<T,TBase> >,
	public DWebBrowserEvent2Impl<CDHtmlDialogImpl<T,TBase> >
{
public:
	typedef CDHtmlDialogImpl<T,TBase> thisClass;
	typedef ATL::CDialogImplBaseT< TBase > baseDialog;
	typedef IDocHostUIHandlerDispatchImpl<CDHtmlDialogImpl<T,TBase> > DocHostUIHandlerDispatch;
	typedef DWebBrowserEvent2Impl<CDHtmlDialogImpl<T,TBase> > WebBrowserEvent2;
```

CDHtmlDialog::Create函数和CDHtmlDialog::DoModal函数是整个模板类的初始化函数，函数中调用如下代码，创建dialog窗口
```C++
HWND hWnd = ::CreateDialogParam(
    _AtlBaseModule.GetResourceInstance(), 
    MAKEINTRESOURCE(static_cast<T*>(this)->IDD),
    hWndParent, 
    T::StartDialogProc, 
    dwInitParam);
```

实际的窗口类为
```C++
static INT_PTR CALLBACK DialogProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
	thisClass* pThis = (thisClass*)hWnd;
	if (uMsg == WM_INITDIALOG)
	{
		//创建ActiveX控件
		pThis->m_wndBrowser.Create(pThis->m_hWnd, NULL, NULL, WS_CHILD|WS_VISIBLE);
		if (pThis->m_wndBrowser.IsWindow())
		{
			LPOLESTR szClsid = NULL;
			if (S_OK == StringFromCLSID(CLSID_WebBrowser, &szClsid))
			{
				//ActiveX控件上创建WebBrowser控件
				if (SUCCEEDED(pThis->m_wndBrowser.CreateControl(szClsid)))
				{
					pThis->m_wndBrowser.SetExternalUIHandler((DocHostUIHandlerDispatch*)pThis);
					pThis->m_wndBrowser.QueryControl(IID_IWebBrowser2, (void**)&pThis->m_pBrowserApp);
					pThis->ConnectToWebBrowser(pThis->m_pBrowserApp);
				}
				CoTaskMemFree(szClsid);
			}
			//pThis->m_wndBrowser.ShowWindow(SW_SHOW);
			pThis->SendMessage(WM_SIZE);
		}
		USES_CONVERSION;
		if (pThis->m_strDlgCaption.Length()>0)
			pThis->SetWindowText(W2CT(pThis->m_strDlgCaption));
		if (pThis->m_nHtmlResID)
   			pThis->LoadFromResource(pThis->m_nHtmlResID);
		else if (pThis->m_szHtmlResID)
			pThis->LoadFromResource(pThis->m_szHtmlResID);
		else if (pThis->m_strCurrentUrl)
			pThis->Navigate(OLE2CT(pThis->m_strCurrentUrl));
	}
	else if (uMsg == WM_DESTROY)
	{
		//销毁窗口
		pThis->DisconnectDHtmlEvents();
		pThis->m_spHtmlDoc = NULL;
			// now tell the browser control we're shutting down
		if (pThis->m_pBrowserApp)
		{
			pThis->DisconnectToWebBrowser(pThis->m_pBrowserApp);
			CComPtr<IOleObject> spObject;
			pThis->m_pBrowserApp->QueryInterface(IID_IOleObject, (void **) &spObject);
			if (spObject != NULL)
			{
				spObject->Close(OLECLOSE_NOSAVE);
				spObject.Release();
			}
			pThis->m_pBrowserApp = NULL;
		}
		if (pThis->m_wndBrowser.IsWindow())
			pThis->m_wndBrowser.DestroyWindow();
	}
	else if (uMsg == WM_SIZE)
	{
		//修改窗口大小
		if (!pThis->m_bAttachedControl && pThis->m_wndBrowser.m_hWnd)
		{
			RECT rc;
			pThis->GetClientRect(&rc);
			pThis->m_wndBrowser.MoveWindow(0, 0, (int)(rc.right-rc.left), (int)(rc.bottom-rc.top));
		}
	}
	else if (uMsg == WM_GETMINMAXINFO)
	{
		//如果设置固定大小,这里就是控制固定大小空间
		if (!pThis->m_AutoSize)
		{
			MINMAXINFO* lpMMI = (MINMAXINFO*)lParam;
			lpMMI->ptMinTrackSize.x = pThis->m_Width;
			lpMMI->ptMinTrackSize.y = pThis->m_Height;
			lpMMI->ptMaxTrackSize.x = pThis->m_Width;
			lpMMI->ptMaxTrackSize.y = pThis->m_Height;
		}
	}
	return baseDialog::DialogProc(hWnd, uMsg, wParam, lParam);
}
```

控制host窗口大小
```C++
void _OnDocumentComplete(LPDISPATCH pDisp, VARIANT* URL)
	{
		if (pDisp != m_pBrowserApp)
			return;
		ConnectDHtmlElementEvents((((DWORD_PTR)static_cast< CDHtmlSinkHandler* >(this)) - (DWORD_PTR)this));

		CComBSTR title;
		GetDocTitle(title);
		::SetWindowTextW(m_hWnd, title);

		m_AutoSize = TRUE;
		if (!GetDocAttribute(_T("dlg_autosize"), m_AutoSize) || !m_AutoSize)
		{
			m_Height = 0;
			m_Width = 0;
			if (GetDocAttribute(_T("dlg_width"), m_Width) &&
				GetDocAttribute(_T("dlg_height"), m_Height) &&
				m_Width &&
				m_Height)
			{
				ResizeHostWindow(m_Width, m_Height);
			}
		}

		(static_cast<T*>(this))->OnDocumentComplete(pDisp, W2CT(V_BSTR(URL)));
	}
```


# 网页皮肤资源包 #

一般情况下，都是打开一个http网页地址，但如果断开网络时，我们的页面就不展示。有时候需要打开本地的资源文件。这里，我对本地资源包做了一些抽象，最终效果是将资源文件打包为一个DLL
在一个**纯资源DLL工程**中：
假设我们需要包含这几个资源：
```C++
css\bootstrap.min.css
htm\main.html
js\bootstrap.min.js
js\jquery.min.js
```
可以在DLL工程的rc文件中，添加如下内容：
```C++
MAIN.HTML               HTM                     "htm\main.html"
BOOTSTRAP.MIN.CSS       CSS                     "css\bootstrap.min.css"
BOOTSTRAP.MIN.JS        JS                      "js\bootstrap.min.js"
JQUERY.MIN.JS           JS                      "js\jquery.min.js"
```
正常情况下，rc文件一个自定义资源的格式如下：
```C++
CUSTOM_ID				TYPE			"rsrc\xxx.dat"
```
这里CUSTOM_ID是一个数字，其实，CUSTOM_ID域也可以是字符串,TYPE域也是字符串，PE的资源结构本身就是一个目录结构
生成后的DLL的资源格式如下：
![](/images/rc_fmt.png)
在main.html网页中引用其他几个css时，只需在相对路径前加上res:/即可
```C++
<link href="res:/css/bootstrap.min.css" rel="stylesheet" />
<script src="res:/js/jquery.min.js"></script>
<script src="res:/js/bootstrap.min.js"></script>
```
这里之所以能够省略DLL路径，是因为htm页面本身就在DLL中，webbrowser控件可以自动加上DLL路径，这样为我们制作html资源包提供了很大的方便

# 示例代码 #
[hybird-win32](https://github.com/zhaozhongshu/hybird-win32)

运行效果
![](/images/hybird-win32.png)