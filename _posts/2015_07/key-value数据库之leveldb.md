title: key-value数据库之leveldb
date: 2015-07-28 17:11:34
updated: 2015-07-28 17:11:37
tags:
- 数据库
- C++

layout:    
comments:
categories:
permalink:
---

#key-value数据库简介
在stl中，有一个模版库`map<k,v>`容器，可以通过key值查找value值。
kv数据库的作用也是类似的，只不过它的key、value值都是二进制串。

**跟RDBMS对比**
kv数据库提供的功能很简单，根据key做查询、删除、添加、修改，缺少一些复杂的事务支持。
。
kv数据库其实就相当于cache
对于一个大系统中，许多模块都可以通过配置cache来加速，用cache的地方都可以用kv数据库

**跟map、list等stl容器对比**
如果数据量比较小的话（100w条记录以下），其实都没必要用kv数据库，直接用map搞定，效率还高。但它也有它的优势，就是具备数据库的一些特征：
* 支持持久化
* 超大数据量时，效率较好

#leveldb数据库
windows端的移植：
* **实现port_win.h中定义的几个类**

Mutex类：使用CRITICAL_SECTION实现

CondVar类：使用semphore信号灯实现

Snappy_Compress函数：封装snappy压缩

* **实现Env类（在env.cc中实现windows版本的回调函数）**

主要封装文件读写、线程操作等

#leveldb数据库操作

见leveldb文档 leveldb/doc/index.html

```C++
  leveldb::DB* db;
  leveldb::Options options;
  options.create_if_missing = true;

  options.env = ...
  //用于自定义key的比较函数
  const Comparator* comparator;
  //如果要自定义文件读写、线程创建的话、需要提供对象指针
  Env* env;

  leveldb::Status status = leveldb::DB::Open(options, "/tmp/testdb", &db);
  assert(status.ok());

  //存取
  std::string value;
  leveldb::Status s = db->Get(leveldb::ReadOptions(), key1, &value);
  if (s.ok()) s = db->Put(leveldb::WriteOptions(), key2, value);
  if (s.ok()) s = db->Delete(leveldb::WriteOptions(), key1);
  ....

  //批量写入 、原子写入
  std::string value;
  leveldb::Status s = db->Get(leveldb::ReadOptions(), key1, &value);
  if (s.ok()) {
    leveldb::WriteBatch batch;
    batch.Delete(key1);
    batch.Put(key2, value);
    s = db->Write(leveldb::WriteOptions(), &batch);
  }

  //关闭db 
  delete db;
```

#leveldb性能分析
写入100万条不同key的数据
```
test_stdmap_read add 1048576 records 5426 mini seconds
test_stdmap_read query 1048576 records 3690 mini seconds
test_leveldb_read add 1048576 records 11693 mini seconds
test_leveldb_read query 1048576 records 11466 mini seconds
```
可以看出100w条及以下数据存取时，map比leveldb快2倍
但是leveldb也有它的优势：支持持久化

leveldb加o2后
```
test_stdmap_read add 1048576 records 5358 mini seconds
test_stdmap_read query 1048576 records 3714 mini seconds
test_leveldb_read add 1048576 records 7245 mini seconds
test_leveldb_read query 1048576 records 6322 mini seconds
```

#rocksdb数据库
在leveldb基础上改进而来，官网声称效率高数倍
