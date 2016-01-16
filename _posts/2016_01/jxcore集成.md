title: jxcore集成
date: 2016-01-16 16:20:54
updated: 2016-01-16 16:20:57
tags:
- Node.js
- javascript
- js
- jxcore

layout:
comments:
categories:
permalink:

---
* **[1.一个集成的例子](#1.一个集成的例子)**


# 1.一个集成的例子
```c++
#include "jx.h"
void callback(JXResult *results, int argc) {
  // do nothing
}
//前argc个变量为函数参数，第argc+1变量为函数返回值
void sampleMethod(JXResult *results, int argc) {
  flush_console("sampleMethod Called;\n");

  std::stringstream ss_result;
  for (int i = 0; i < argc; i++) {
    std::string str_result;
    ConvertResult(&results[i], str_result);
    ss_result << i << " : ";
    ss_result << str_result << "\n";
  }

  flush_console("%s", ss_result.str().c_str());

  // return an Array back to JS Land
  const char *str = "[1, 2, 3]";

  // results[argc] corresponds to return value
  JX_SetJSON(&results[argc], str, strlen(str));
}

int main(int argc, char **args) {
  //框架初始化
  JX_Initialize(path, callback);
  //初始化JS引擎
  JX_InitializeNewEngine();

  char *contents = "console.log('hello world');";
  //定义main.js虚拟文件内容，main.js为框架的入口
  JX_DefineMainFile(contents);
  //定义native方法，在js中可以用这样访问process.natives.sampleMethod( ... )
  JX_DefineExtension("sampleMethod", sampleMethod);
  //执行
  JX_StartEngine();

  //循环
  while (JX_LoopOnce() != 0) Sleep(1);

  JXValue result;
  JX_Evaluate(
    "var arr = process.natives.sampleMethod('String Parameter', {foo:1}); \n"
    "console.log('result: ', arr, 'length:', arr.length ); \n"
    "setTimeout(function() { \n"
    "  console.log('end!'); \n"
    "}, 100);",
    "myscript", &result);

  JX_Free(&result);
  // loop for possible IO
  // or JX_Loop() without usleep / while
  while (JX_LoopOnce() != 0) Sleep(1);

  JX_StopEngine();
}
```


