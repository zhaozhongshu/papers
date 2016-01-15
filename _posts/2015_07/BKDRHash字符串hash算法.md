title: BKDRHash字符串hash算法
date: 2015-07-21 11:16:25
tags:
 - 算法
---

#BKDRHash字符串hash算法
在进行大量数据存取时，往往需要借助hash表来提高存取速度。在文本字符串hash函数中，BKDR算法冲突最少，也最简单。
```C++
unsigned int BKDRHash(const unsigned char* str, size_t len) 
{
    unsigned int seed = 131; // 31 131 1313 13131 131313 etc..
    unsigned int hash = 0;
    
    for(size_t i = 0; i < len; i++)
    {
        hash = (hash * seed) + str[i];
    }

    return hash;
}
```