title: ragel state compiler
date: 2015-08-19 10:06:49
updated: 2015-08-19 10:06:53
tags:
- 算法
- 确定自动机

layout:
comments:
categories:
permalink:

---
* **[简介](#简介)**
* **[url解析](#url解析)**
* **[atoi案例分析](#atoi案例分析)**
* **[awk案例分析](#awk案例分析)**
* **[C文法案例分析](#C文法案例分析)**
* **[多状态机实例](#多状态机实例)**
* **[gotocallret使用](#gotocallret使用)**

# 简介
    ragel类似flex词法分析器，它可以在正则表达式状态机发生转移时，嵌入解析动作，可以生成C/C++/objc等语言。
ragel是一个定义状态机的语言，它将状态机定义文件会变成C/C++代码。任何编程语言都可以转义成一个**确定性有限状态机**，因此任意语言都可以用一个状态机替换。
ragel以C, C++, Objective-C, D, Go, Java or Ruby代码的形式输出确定性有限状态机，生成的代码是非常通用的。
ragel状态机代码处理输入数据，当输入数据处理完，ragel状态机有“accepted”、“not accepted”两个结果。
**ragel状态机可以像正则表达式一样使用**（非常好的地方时，没有正则表达式，只有C++状态机代码,效率非常高，省掉解析正则表达式）。
**ragel状态机可以用于解析输入数据**（例如：http协议解析等）
ragel语言中定义了很多操作符，用于构造ragel状态机。一个状态机可以由需要小的状态机构造，最终**一个ragel状态机代表一种语言**（协议），它可以识别、解析这种语言下所有的语句（符合协议的数据）

**一个语言(状态机)**, 就是一个数据串集合，多个语言(状态机)可以做union、intersection、diference、contact、kleen star操作。

# 构造状态机

   使用ragel语法规则编写ragel状态机，然后用ragel.exe翻译生成C++代码。
ragel将rl文件中 %%{和}%%之间或者%%开头的单行内容当作ragel语句解析处理，其余部分不处理，直接输出。
一个例子：
```C++
#include  <string.h>
#include  <stdio.h>
%%{
machine  foo;
main  :=
(  ’foo’  |  ’bar’  )
0  @{  res  =  1;  };
}%%
%%  write  data;

int  main(  int  argc,  char  **argv  )
{
int  cs,  res  =  0;
if  (  argc  >  1  )  {
char  *p  =  argv[1];
char  *pe  =  p  +  strlen(p)  +  1;
%%  write  init;
%%  write  exec;
}
printf("result  =  %i\n",  res  );
return  0;
}

扫描命令行输入，检查是否有foo、bar字符串
```

## fsm命名语句
   machine  fsm_name;
fsm为最终状态机，这个语句给最终状态机命名，一般出现在ragel代码第一行，如果没有指定名称，则使用前一个代码块的名称，若前一个代码块没名称，则提示错误，当包含多个rl文件时，用fsmname来聚合不同文件中的状态机语句

## 状态机定义语句
    <name>  =  <expression>;
状态机定义语句为FSM表达式指定一个name，在其他表达式中可以通过name引用这个表达式，状态机定义表达式不会生成任何状态，它只定义一个子状态机，以后其他地方可以使用。只有实例化之后，才会生成状态。

## 状态机实例化语句
    <name>  :=  <expression>;
实例化语句会生成一组状态，用来代表这个表达式。每条实例化语句都会生成一组确定的状态。每个实例化语句有一个**开始状态**, 在使用这条实例化语句时产生代码的data section中。
如果是main实例化语句，它的开始状态就是整个FSM状态机的开始状态，在**write  init**时，将main实例化语句的开始状态写入cs变量。
如果没有main实例化语句，则把最后一条实例化语句的开始状态当作整个FSM状态机的开始状态，在execution loop以外，可以通过修改cs变量，调用任何一个实例化状态。在execution loop内，只能通过fcall、fgoto、fnext语句调用任意一个实例化状态机

## include语句
    include  FsmName  "inputfile.rl";
FsmName和输入文件名都可以省略，但至少有一个存在，如果没有fsmname，会从输入文件中搜索所有fsmname与当前fsmname相同的语句

## import语句
    import  "inputfile.h";
该语句去掉输入文件中的如下这些关键字：
• name  ’=’  number
• name  ’=’  lit_string
• ’define’  name  number
• ’define’  name  lit_string

## ragel代码的此法分析
在ragel语句中，这些此法规则会生效：
• #注释一行代码
• "", ’’, //, [] 定义字符串，它里面的这些符号被转义：\0  \a  \b  \t  \n  \v  \f  \r，一个字符串有多行时，每行以\结尾
• {}用于插入host动作代码(C/C++代码)
• [+-]?[0-9]+ 识别数字正则
• 0x[0-9A-Fa-f]+ 识别16进制正则
• access, action, alphtype, getkey, write, machine and include关键字
• [a-zA-Z_][a-zA-Z_0-9]* 识别标识符正则
• 空白字符

## 基本状态机
    基本的正则表达式语句。
它们是构造状态机的基本单元
• 'hello'
生成匹配hello字符序列的状态机，开始状态+字符串长度，共6个状态，'hello'i表示忽略大小写
![](/images/state_hello.png)
• "hello" – 同上
• [hello] – 一组字符，有两个状态，例如[  \t]表示空格或tab，[^...]表示不在字符列表中
![](/images/state_union1.png)
• '', "", [] – 0长度状态机.  只有一个状态
![](/images/state1.png)
• 42 – 数字，生成两个状态，数字42作为转移条件，数字可以是10、16进制，最大最小值由host语言决定，例如i386上short范围-32768 to 32767
![](/images/state2.png)
• /simple_regex/ – 正则表达式，由一组表达式串联起来，每个表达式可以是：字符串、any（表示任意字符）、[]。如果忽略大小写，后面加i，例如/GET/i
ragel不支持非常复杂的表达式，/ab*[c-z].*[123]/. DEF表达式生成的状态图如下：
![](/images/state3.png)
• builtin_machine – 一些内置的状态机可供使用，它们都是两个状态
–  any       – Any character in the alphabet.
–  ascii   – Ascii characters. 0..127
–  extend – This is the range -128..127 for signed alphabets and the range 0..255 for unsigned alphabets.
–  alpha   – Alphabetic characters. [A-Za-z]
–  digit   – Digits. [0-9]
–  alnum   – Alpha numerics. [0-9A-Za-z]
–  lower   – Lowercase characters. [a-z]
–  upper   – Uppercase characters. [A-Z]
–  xdigit – Hexadecimal digits. [0-9A-Fa-f]
–  cntrl   – Control characters. 0..31
–  graph   – Graphical characters. [!-~]
–  print   – Printable characters. [  -~]
–  punct  – Punctuation. Graphical characters that are not alphanumerics. [!-/:-@[-‘{-~]
–  space   – Whitespace. [\t\v\f\n\r  ]
–  zlen     – Zero length string. ""
–  empty   – Empty set. Matches nothing. ^any

## 操作符优先级
下表给出了从低到高的优先级
![](/images/state4.png)

## 常规操作符
当使用ragel时，有必要了解它是怎样生成状态机的。
可以使用Graphviz调试状态机，ragel.exe -V可以生成ragel脚本的Graphviz Dot文件，然后用Graphviz绘制状态转移图

### union
    expr  |  expr
生成一个新的状态机，它可以匹配状态机1和状态机2
![](/images/state5.png)
下面是一个例子：
```C++
#  Hex  digits,  decimal  digits,  or  identifiers
main  :=  ’0x’  xdigit+  |  digit+  |  alpha  alnum*;
```
![](/images/state6.png)

### Intersection 交集
    expr  &  expr
例子：
```C++
#  Match  lines  four  characters  wide  that  contain
#  words  separated  by  whitespace.
main  :=
/[^\n][^\n][^\n][^\n]\n/*  &
(/[a-z][a-z]*/  |  [  \n])**;
```
![](/images/state7.png)

### Difference 差集
    expr  -  expr
生成一个新的状态机，它匹配在machine1中不在machine2中的串
案例：
```C++
#  Subtract  keywords  from  identifiers.
main  :=  /[a-z][a-z]*/  -  (  ’for’  |  ’int’  );
```
![](/images/state8.png)

## Strong Difference
    expr  --  expr
生成新状态机，匹配在machine1中，且不包含machine2字串。
它等价于expr  -  (  any*  expr  any*  )
例子：
```C++
crlf  =  ’\r\n’;
main  :=  [a-z]+  ’:’  (  any*  --  crlf  )  crlf;
```
![](/images/state9.png)

### Concatenation 串联
    expr  .  expr
生成新的状态机，它匹配所有machine1 followed machine2的字串。
![](/images/state10.png)
例子：
```C++
#最后一行为'EOF\n'
main  :=  /[^\n]*\n/*  .  ’EOF\n’;
```
![](/images/state11.png)

### Kleene Star 重复[0,~)次
    expr*
![](/images/state12.png)

### 重复[1,~)次
    expr+
等价于expr  .  expr*
![](/images/state13.png)

### 重复[0,1]次
    expr?
等价于(expr  |  ’’  )
![](/images/state14.png)

### 重复[n,m]次
    expr  {n}      – Exactly N copies of expr.
    expr  {,n}    – Zero to N copies of expr.
    expr  {n,}    – N or more copies of expr.
    expr  {n,m}  – N to M copies of expr.

### 字符串取反
    !expr
等价于(any*  -  expr)

### 字符取反
    ^expr
等价于(any  -  expr)

## 状态机简化
将状态机进行等价转换，减少冗余状态，类似Hopcroft’s状态精简算法

# Embedding Actions（状态转移动作插入）
ragel允许用户在状态机转移时，嵌入动作代码
定义一个动作:
```C++
action  ActionName  {
/*  Code  an  action  here.  */
count  +=  1;
}
```
动作名可以在表达式中引用插入。也可以直接{}插入

• >   从start state转移到其他state时
• @   从其他state转移到final state时
• $   所有状态转移时
• %   从final state离开状态机、或eof时

## Entering Action
    expr  >  action
从开始状态进入状态机时，插入动作，如果开始状态也是结束状态，则进入开始状态时，也会插入
![](/images/state15.png)

## Finishing Action
    expr  @  action
进入final state时，嵌入动作，后续输入可能使状态机退出再进入final state，所以final state可能执行多次
![](/images/state16.png)
 
## All Transition Action
    expr  $  action
只要状态转移，就嵌入动作
案例：
```C++
#  Execute  A  on  any  characters  of  the  machine.
main  :=  (  ’m1’  |  ’m2’  )  $A;
```
![](/images/state17.png)

## Leaving Actions
    expr  %  action
从final state离开状态机时，嵌入动作
![](/images/state18.png)

# State Action Embedding Operators
通过状态嵌入操作符，可以向某个状态嵌入动作。与状态转移嵌入类似，特也有多种类型

The diﬀerent classes of states are:
• >   – the start state
• <   – any state except the start state
• $   – all states
• %   – ﬁnal states
• @   – any state except ﬁnal states
• <> – any except start and ﬁnal (middle)

The diﬀerent kinds of embeddings are:
• ~ – to-state actions (to)
• * – from-state actions (from)
• / – EOF actions (eof)
• ! – error actions (err)
• ^ – local error actions (lerr)

## To-State and From-State Actions
To-State Actions
```C++
>~action    >to(name)   >to{...}   – the start state
<~action    <to(name)   <to{...}   – any state except the start state
$~action    $to(name)   $to{...}   – all states
%~action    %to(name)   %to{...}   – ﬁnal states
@~action    @to(name)   @to{...}   – any state except ﬁnal states
<>~action   <>to(name)  <>to{...} – any except start and ﬁnal (middle)
```

当状态机move到目标状态时，to-state动作
From-State Actions
```C++
>*action         >from(name)         >from{...}   – the start state
<*action         <from(name)         <from{...}   – any state except the start state
$*action         $from(name)         $from{...}   – all states
%*action         %from(name)         %from{...}   – ﬁnal states
@*action         @from(name)         @from{...}   – any state except ﬁnal states
<>*action       <>from(name)       <>from{...} – any except start and ﬁnal (middle)
```

EOF Actions
```C++
>/action         >eof(name)         >eof{...}   – the start state
</action         <eof(name)         <eof{...}   – any state except the start state
$/action         $eof(name)         $eof{...}   – all states
%/action         %eof(name)         %eof{...}   – ﬁnal states
@/action         @eof(name)         @eof{...}   – any state except ﬁnal states
<>/action       <>eof(name)       <>eof{...} – any except start and ﬁnal (middle)
```

错误处理
通过插入错误动作，捕获错误信息
Global Error Actions
```C++
>!action         >err(name)         >err{...}   – the start state
<!action         <err(name)         <err{...}   – any state except the start state
$!action         $err(name)         $err{...}   – all states
%!action         %err(name)         %err{...}   – ﬁnal states
@!action         @err(name)         @err{...}   – any state except ﬁnal states
<>!action       <>err(name)       <>err{...} – any except start and ﬁnal (middle)
```

Local Error Actions
```C++
>^action         >lerr(name)         >lerr{...}   – the start state
<^action         <lerr(name)         <lerr{...}   – any state except the start state
$^action         $lerr(name)         $lerr{...}   – all states
%^action         %lerr(name)         %lerr{...}   – ﬁnal states
@^action         @lerr(name)         @lerr{...}   – any state except ﬁnal states
<>^action       <>lerr(name)       <>lerr{...} – any except start and ﬁnal (middle)
```

一个例子：
```C++
action  cmd_err  {
    printf(  "command  error\n"  );
    fhold;  fgoto  line;
}
action  from_err  {
    printf(  "from  error\n"  );
    fhold;  fgoto  line;
}

action  to_err  {
    printf(  "to  error\n"  );
    fhold;  fgoto  line;
}
line  :=  [^\n]*  '\n'  @{  fgoto  main;  };
main  :=  (
    (
    'from'  @err(cmd_err)
    (  ws+  address  ws+  date  '\n'  )  $err(from_err)  |
    'to'  @err(cmd_err)
    (  ws+  address  '\n'  )  $err(to_err)
    )
)*;

```

## 在动作代码中可用的变量与表达式
如下变量可用:
• fpc – 当前缓冲区指针，等价p. 
• fc – 当前字符值，等价 (*p).
• fcurs – 当前状态值，要改变状态，请用fgoto，fnext、fcall，外部可以通过cs变量修改状态
• ftargs – 目标状态值.
• fentry(<label>) – 返回代表label入口的整数值

如下表达式可用：
• fhold; – 不再解析当前字符，不会发生状态转移，等价于p--
• fexec  <expr>; 设置要处理的下一个字符，等价于修改p值
• fgoto  <label>; 跳转到<label>，跳转到目的状态
• fgoto  *<expr>; 跳转到目的状态
• fnext  <label>; 设置下一个状态为label入口，它不是马上跳转到目的状态，表达式后面跟的动作代码会执行
• fnext  *<expr>; 同上
• fcall  <label>; 保存下一个状态，并跳转到目的状态，当执行fret时，从栈中返回到保存状态，使用fcall时，需要提前设置调用栈，两个变量**stack**、**top**.
• fcall  *<expr>; 同上
• fret; 
• fbreak; advance p，保存目标状态到cs，跳出execution loop

# 处理不确定性

# host程序集成

## Variables Used by Ragel
ragel需要host语言定义一组变量，至少包括cs、p、pe变量，如果有EOF动作，还需要定义eof变量，如果使用fcall、fret，还需要定义stack、top变量，如果使用了scanner，还需要定义act、ts、te变量

• cs - 当前状态，int类型.  在调用状态机时，必须存在，可以子loop外部修改，不能在loop内部修改
• p - 输入缓冲区开始，调用状态机前初始化
• pe - 输入缓冲区结束，[p, p+length]为缓冲区
• eof - 输入流结束，当输入结束时，可以设置p  =  pe  =  eof，然后调用状态机
• data - Go,  Java and Ruby中才用到.
• stack - 整数数组指针
• top - 整数，栈顶.
• act - 整数.
• ts - 指针.
• te - 指针.
一个不包含任何动作的例子：
```C++
#include  <stdio.h>
#include  <string.h>
%%{
    machine  foo;
    write  data;
}%%
int  main(  int  argc,  char  **argv  )
{
    int  cs;
    if  (  argc  >  1  )  {
        char  *p  =  argv[1];
        char  *pe  =  p  +  strlen(  p  );
        %%{
            main  :=  [0-9]+  (  '.'  [0-9]+  )?;
            write  init;
            write  exec;
        }%%
    }
    printf("result  =  %i\n",  cs  >=  foo_first_final  );
    return  0;
}
```

## 数据类型定义
    alphtype  unsigned  int;
默认定义
C/C++/Objective-C:
char unsigned   char
short           unsigned  short
int unsigned    int
long unsigned   long

## Getkey Statement
    getkey  fpc->id;
定义如何从p指针获取字符，默认表达式 (*p)

## Access Statement
    access  fsm->;
定义如何访问状态机内部的数据cs、top、stack、ts、te、act变量，如果所有上下文放在一个结构体中，这里就可以给出结构体变量名称
## Variable Statement
    variable  p  fsm->p;
如何访问特定变量

## Pre-Push Statement
    prepush  {
    /*  stack  growing  code  */
    }
动态调整堆栈代码
5.7    Post-Pop Statement
    postpop  {
    /*  stack  shrinking  code  */
    }
动态调整堆栈代码

## Write Statement
    write  data  [options];
生成状态机所需的常量静态数据，其中两个变量比较有用，name_error定义了最后的出错状态（不被接受状态），当解析正确时，name_error为-1，变量name_first_final保存了 ﬁrst ﬁnal状态ID
    write  start;
    write  first_final;
    write  error;
另外一种引用start、first_final、error这三个变量的方式，看下面的例子：
```C++
/*  Did  parsing  succeed?  */
if  (  cs  <  %%{  write  first_final;  }%%  )  {
result  =  ERR_PARSE_ERROR;
goto  fail;
}
```

    write  init  [options];
生成状态机初始化代码，在调用状态机之前，只能初始化一次，最小情况下，它设置当前状态为start state
若加nocs选项，则跳过cs初始化，我们自己需要手动初始化cs

    write  exec  [options];
生成状态机执行代码，我们需要先准备好一组变量，至少包括p、pe、cs、stack、top等
下面一个例子：
```C++
int  have  =  0;
while  (  1  )  {
    char  *p,  *pe,  *data  =  buf  +  have;
    int  len,  space  =  BUFSIZE  -  have;
    if  (  space  ==  0  )  {
        fprintf(stderr,  "BUFFER  OUT  OF  SPACE\n");
        exit(1);
    }
    len  =  fread(  data,  1,  space,  stdin  );
    if  (  len  ==  0  )
        break;
    /*  Find  the  last  newline  by  searching  backwards.  */
    p  =  buf;
    pe  =  data  +  len  -  1;
    while  (  *pe  !=  ’\n’  &&  pe  >=  buf  )
        pe--;
    pe  +=  1;
    
    //准备要处理的数据
    %%  write  exec;
    
    //拷贝还没处理的数据
    /*  How  much  is  still  in  the  buffer?  */
    have  =  data  +  len  -  pe;
    if  (  have  >  0  )
        memmove(  buf,  pe,  have  );
    if  (  len  <  space  )
        break;
}
```

ragel.exe生成代码的几个选项
```C++
-T0         binary search table-driven        C/D/Java/Ruby/C#/Go
-T1         binary search, expanded actions        C/D/Ruby/C#/Go
-F0         ﬂat table-driven C/D/Ruby/C#/Go
-F1         ﬂat table, expanded actions C/D/Ruby/C#/Go
-G0         goto-driven C/D/C#/Go
-G1         goto, expanded actions C/D/C#/Go
-G2         goto, in-place actions C/D/Go
```
一般，使用-G2生成的代码最高效

# Beyond the Basic Model

## 模块化解析
通过jump、call机制，实现模块化解析
```C++
action  return  {  fret;  }
action  call_date  {  fcall  date;  }
action  call_name  {  fcall  name;  }

#  A  parser  for  date  strings.
date  :=[0-9][0-9]  '/'
        [0-9][0-9]  '/'
        [0-9][0-9][0-9][0-9]  '/'  @return;

#  A  parser  for  name  strings. **贪心匹配
name  :=  (  [a-zA-Z]+  |  ' '  )**  '\n'  @return;

#  The  main  parser.
headers  =
    (  'from'  |  'to'  )  ':'  @call_name  |
    (  'departed'  |  'arrived'  )  ':'  @call_date;
main  :=  headers*;
```

#url 解析
```C++
%%{
    machine url_parser;

    action mark { mark = fpc; }
    action mark_host { host_mark = fpc; }

    action save_host {
        g_string_truncate(uri->host, 0);
        g_string_append_len(uri->host, host_mark, fpc - host_mark);
        g_string_ascii_down(uri->host);
    }
    action save_authority {
        g_string_truncate(uri->authority, 0);
        g_string_append_len(uri->authority, mark, fpc - mark);
        g_string_ascii_down(uri->authority);
    }
    action save_path {
        g_string_append_len(uri->path, mark, fpc - mark);
        g_string_append_len(uri->raw_path, mark, fpc - mark);
    }
    action save_query {
        g_string_append_len(uri->query, mark, fpc - mark);
        g_string_append_len(uri->raw_path, mark-1, fpc - mark+1); /* include '?' in append */
    }
    action save_scheme {
        g_string_append_len(uri->scheme, mark, fpc - mark);
    }
    #16进制编码
    pct_encoded = "%" xdigit xdigit;
    
    #各种分隔符
    gen_delims  = ":" | "/" | "?" | "#" | "[" | "]" | "@";
    sub_delims  = "!" | "$" | "&" | "'" | "(" | ")" | "*" | "+" | "," | ";" | "=";

    reserved    = gen_delims | sub_delims;
    unreserved  = alpha | digit | "-" | "." | "_" | "~";

    # many clients don't encode these, e.g. curl, wget, ...
    delims      = "<" | ">" | "#" | "%" | '"';
    unwise      = " " | "{" | "}" | "|" | "\\" | "^" | "[" | "]" | "`";

    pchar = unreserved | pct_encoded | sub_delims | ":" | "@" | delims | unwise;
    path = ("/" ( "/" | pchar)*) >mark %save_path;

    scheme = "http" | "https";

#simple ipv4 address
    dec_octet = digit{1,3};
    IPv4address = dec_octet "." dec_octet "." dec_octet "." dec_octet;

    IPvFuture  = "v" xdigit+ "." ( unreserved | sub_delims | ":" )+;

# simple ipv6 address
    IPv6address = (":" | xdigit)+ IPv4address?;

    IP_literal = "[" ( IPv6address | IPvFuture  ) "]";

    reg_name = ( unreserved | pct_encoded | sub_delims )+;

    userinfo    = ( unreserved | pct_encoded | sub_delims | ":" )*;
    host        = IP_literal | IPv4address | reg_name;
    port        = digit+;
    authority   = ( userinfo "@" )? (host >mark_host %save_host) ( ":" port )?;

    query = ( pchar | "/" | "?" )* >mark %save_query;
    fragment = ( pchar | "/" | "?" )*;

    URI_path = (path ( "?" query )?) ( "#" fragment )?;

    URI = (scheme >mark %save_scheme) "://" (authority >mark %save_authority) URI_path;

    parse_URI := URI | ("*" >mark %save_path) | URI_path;
    parse_URI_path := URI_path;
    parse_Hostname := (host >mark_host %save_host) ( ":" port )?;

    write data;
}%%

gboolean li_parse_raw_url(liRequestUri *uri) {
    const char *p, *pe, *eof;
    const char *mark = NULL, *host_mark = NULL;
    int cs;

    p = uri->raw->str;
    eof = pe = uri->raw->str + uri->raw->len;

    %% write init nocs;
    cs = url_parser_en_parse_URI;

    %% write exec;

    return (cs >= url_parser_first_final);
}

gboolean li_parse_raw_path(liRequestUri *uri, GString *input) {
    const char *p, *pe, *eof;
    const char *mark = NULL, *host_mark = NULL;
    int cs;

    p = input->str;
    eof = pe = input->str + input->len;

    g_string_truncate(uri->path, 0);
    g_string_truncate(uri->raw_path, 0);
    g_string_truncate(uri->query, 0);

    %% write init nocs;
    cs = url_parser_en_parse_URI_path;

    %% write exec;

    if (cs >= url_parser_first_final) {
        li_url_decode(uri->path);
        li_path_simplify(uri->path);
    }

    return (cs >= url_parser_first_final);
}

gboolean li_parse_hostname(liRequestUri *uri) {
    const char *p, *pe, *eof;
    const char *mark = NULL, *host_mark = NULL;
    int cs;

    g_string_ascii_down(uri->authority);
    p = uri->authority->str;
    eof = pe = uri->authority->str + uri->authority->len;

    %% write init nocs;
    cs = url_parser_en_parse_Hostname;

    %% write exec;

    return (cs >= url_parser_first_final);
}

```

# atoi案例分析
上代码：
```C++
%%{
#状态机名称
    machine atoi;   
#写入状态机用到的常量
    write data;
    action see_neg {
        neg = true;
    }
    action add_digit { 
        val = val * 10 + (fc - '0');
    }
    main := 
        ( '-'@see_neg | '+' )? ( digit @add_digit )+ 
        '\n';
}%%
long long atoi( char *str )
{
    char *p = str, *pe = str + strlen( str );
    int cs;
    long long val = 0;
    bool neg = false;

    %%{
        #初始化状态机
        write init;
        #生成代码
        write exec;
    }%%
    if ( neg )
        val = -1 * val;
    if ( cs < atoi_first_final )这里也可以改为%%{write  first_final;}%%
        fprintf( stderr, "atoi: there was an error\n" );
    return val;
};
int main()
{
    char buf[1024];
    while ( fgets( buf, sizeof(buf), stdin ) != 0 ) {
        long long value = atoi( buf );
        printf( "%lld\n", value );
    }
    return 0;
}
```

# awk案例分析
上代码
```C++
%%{
    machine awkemu;
    action start_word {
        ws[nwords] = fpc;   保存word起始地址
    }
    action end_word {
        we[nwords++] = fpc; 保存word结束地址
    }
    action start_line {
        nwords = 0;
        ls = fpc;
    }
    action end_line {
        printf("endline(%i): ", nwords );
        fwrite( ls, 1, p - ls, stdout );
        printf("\n");
        for ( i = 0; i < nwords; i++ ) {
            printf("  word: ");
            fwrite( ws[i], 1, we[i] - ws[i], stdout );
            printf("\n");
        }
    }
    #^相当于any - expr只对单个字符有效
    word = ^[ \t\n]+; 
    #空格
    whitespace = [ \t];
    #进入word状态机时，调用start_word，离开word状态机时，调用end_word
    blineElements = word >start_word %end_word | whitespace;
    #进入一行时，调用start_line，到final state时，调用end_line
    line = ( blineElements** '\n' ) >start_line @end_line;

    main := line*;
}%%

#不要生成final、error变量
%% write data noerror nofinal;
char buf[4096];
int main()
{
    int i, nwords = 0;
    char *ls = 0;
    char *ws[4096];
    char *we[256];
    int cs;
    int have = 0;
    初始化状态机
    %% write init;
    while ( 1 ) {
        char *p, *pe, *data = buf + have;
        int len, space = BUFSIZE - have;
        if ( space == 0 ) { 
            fprintf(stderr, "buffer out of space\n");
            exit(1);
        }

        len = fread( data, 1, space, stdin );
        if ( len == 0 )
            break;
        p = buf;
        pe = buf + have + len - 1;
        while ( *pe != '\n' && pe >= buf )
            pe--;
        pe += 1;
        
        动作代码
        %% write exec;
        have = data + len - pe;
        if ( have > 0 )
            memmove( buf, pe, have );
        if ( len < space )
            break;
    }
    if ( have > 0 )
        fprintf(stderr, "input not newline terminated\n");
    return 0;
}

```

## C文法案例分析
```C++
%%{
    machine clang;
    #统计行数
    newline = '\n' @{curline += 1;};
    any_count_line = any | newline;

    #以*/结束
    c_comment := any_count_line* :>> '*/' @{fgoto main;};
    
    #|*表示scanner状态机开始
    #scanner状态机与lex相似，多条规则中，按最长匹配
    main := |*
        alnum_u = [0-9A-Za-z] | '_'; 
        alpha_u = [A-Za-z] | '_';
        
        #punct为可显示字符中-[A-Za-z]部分，包括[!-/:-@[-'{-~]
        ( punct - [_'"] ) {
            printf( "symbol(%i): %c\n", curline, ts[0] );
        };
        #标识符
        alpha_u alnum_u* {
            printf( "ident(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };

        sliteralChar = [^'\\] | newline | ( '\\' . any_count_line );
        '\'' . sliteralChar* . '\'' {
            printf( "single_lit(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };

        dliteralChar = [^"\\] | newline | ( '\\' any_count_line );
        '"' . dliteralChar* . '"' {
            printf( "double_lit(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };

        any_count_line - 0x21..0x7e;
        '//' [^\n]* newline;

        '/*' { fgoto c_comment; };

        digit+ {
            printf( "int(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };

        digit+ '.' digit+ {
            printf( "float(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };

        '0x' xdigit+ {
            printf( "hex(%i): ", curline );
            fwrite( ts, 1, te-ts, stdout );
            printf("\n");
        };
        #*|表示状态机结束
    *|;

    write data nofinal;
}%%
void scanner(){
    static char buf[BUFSIZE];
    int cs, act, have = 0, curline = 1;
    char *ts, *te = 0;
    int done = 0;
    %% write init;
    while ( !done ) {
        char *p = buf + have, *pe, *eof = 0;
        int len, space = BUFSIZE - have;
        len = fread( p, 1, space, stdin );
        pe = p + len;

        %% write exec;
        if ( cs == clang_error ) {
            fprintf(stderr, "PARSE ERROR\n" );
            break;
        }
        if ( ts == 0 )
            have = 0;
        else {
            have = pe - ts;
            memmove( buf, ts, have );
            te = buf + (te-ts);
            ts = buf;
        }
    }
}

```

# 多状态机实例
```C++
#define BUFSIZE 2048
struct Concurrent   #状态机上下文
{
    int cur_char;
    int start_word;
    int start_comment;
    int start_literal;
    int cs;
    int init( );
    int execute( const char *data, int len, bool isEof );
    int finish( );
};

%%{
    machine Concurrent;
    action next_char {
        cur_char += 1;
    }
    action start_word {
        start_word = cur_char;
    }
    action end_word {
        cout << "word: " << start_word << " " << cur_char-1 << endl;
    }
    action start_comment {
        start_comment = cur_char;
    }
    action end_comment {
        cout << "comment: " << start_comment << " " << cur_char-1 << endl;
    }
    action start_literal {
        start_literal = cur_char;
    }
    action end_literal {
        cout << "literal: " << start_literal << " " << cur_char-1 << endl;
    }
    # Count characters.
    chars = ( any @next_char )*;

    # Words are non-whitespace. 
    word = ( any-space )+ >start_word %end_word;
    words = ( ( word | space ) $1 %0 )*;

    comment = ( '/*' any* :>> '*/' ) >start_comment %end_comment;
    comments = ( comment | any )**;

    literalChar = ( any - ['\\] ) | ( '\\' . any );
    literal = ('\'' literalChar* '\'' ) >start_literal %end_literal;
    literals = ( ( literal | (any-'\'') ) $1 %0 )*;

    main := chars | words | comments | literals;
}%%

%% write data;

int Concurrent::init( )
{
    %% write init;
    cur_char = 0;
    return 1;
}

int Concurrent::execute( const char *data, int len, bool isEof )
{
    const char *p = data;
    const char *pe = data + len;
    const char *eof = isEof ? pe : 0;

    %% write exec;

    if ( cs == Concurrent_error )
        return -1;
    if ( cs >= Concurrent_first_final )
        return 1;
    return 0;
}

int Concurrent::finish( )
{
    if ( cs == Concurrent_error )
        return -1;
    if ( cs >= Concurrent_first_final )
        return 1;
    return 0;
}

Concurrent concurrent;
char buf[BUFSIZE];

int main()
{
    concurrent.init();
    while ( 1 ) {
        int len = fread( buf, 1, BUFSIZE, stdin );
        concurrent.execute( buf, len, len != BUFSIZE );
        if ( len != BUFSIZE )
            break;
    }
    if ( concurrent.finish() <= 0 ) cerr << "concurrent: error parsing input" << endl;
    return 0;
}

```

# gotocallret使用
```C++
struct GotoCallRet 
{
    char comm;
    int cs, top, stack[32];
    int init( );
    int execute( const char *data, int len, bool isEof );
    int finish( );
};

%%{
    machine GotoCallRet;
    garble_line := ( (any-'\n')* '\n' ) >{cout << "error: garbling line" << endl;} @{fgoto main;};

    alp_comm := alpha+ $!{fhold;fret;};
    dig_comm := digit+ $!{fhold;fret;};
    action comm_arg {
        if ( comm >= 'a' )
            fcall alp_comm;
        else 
            fcall dig_comm;
    }

    command = (
        [a-z0-9] @{comm = fc;} ' ' @comm_arg '\n'
    ) @{cout << "correct command" << endl;};

    # Any number of commands. If there is an 
    # error anywhere, garble the line.
    main := command* $!{fhold;fgoto garble_line;};
}%%
%% write data;
int GotoCallRet::init( )
{
    %% write init;
    return 1;
}
int GotoCallRet::execute( const char *data, int len, bool isEof )
{
    const char *p = data;
    const char *pe = data + len;
    const char *eof = isEof ? pe : 0;

    %% write exec;
    if ( cs == GotoCallRet_error )
        return -1;
    if ( cs >= GotoCallRet_first_final )
        return 1;
    return 0;
}

#define BUFSIZE 1024
int main()
{
    char buf[BUFSIZE];

    GotoCallRet gcr;
    gcr.init();
    while ( fgets( buf, sizeof(buf), stdin ) != 0 )
        gcr.execute( buf, strlen(buf), false );

    gcr.execute( 0, 0, true );
    if ( gcr.cs < GotoCallRet_first_final )
        cerr << "gotocallret: error: parsing input" << endl;
    return 0;
}

```