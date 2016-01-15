title: reactjs学习
date: 2015-08-26 11:19:18
updated: 2015-08-26 11:19:20
tags:
- js
- 前端
- 模板引擎

layout:
comments:
categories:
permalink:

---
reactjs是一个专用于构建用户界面的js库

官网上描述的几大特点：
* 相当于MVC中的V，只做显示
* 提供中间虚拟DOM树，减少js对真实DOM树的操作提高效率
* 使用JSX语法，上线前最好编译为js（也可以引用JSXTransformer.js编译）

# 编译JSX
安装react编译工具
    npm install -g react-tools
处理一个目录下的JSX语法
    jsx --watch src/ build/     实时编译


# 组件化
```JS
var HelloMessage = React.createClass({
  render: function() {
    return <div>Hello {this.props.name}</div>;
  }
});

React.render(<HelloMessage name="John" />, mountNode);
```
React组件实现render方法，该方法返回要展示的html内容，调用组件所需参数放在this.props中

# 状态机模型
```JS
var Timer = React.createClass({
  getInitialState: function() {
    return {secondsElapsed: 0}; //初始化状态机对象
  },
  tick: function() {            //更新状态机
    this.setState({secondsElapsed: this.state.secondsElapsed + 1});
  },
  componentDidMount: function() {
    this.interval = setInterval(this.tick, 1000);
  },
  componentWillUnmount: function() {
    clearInterval(this.interval);
  },
  render: function() {
    return (
      <div>Seconds Elapsed: {this.state.secondsElapsed}</div>
    );
  }
});
React.render(<Timer />, mountNode);
```
组件不仅可以通过this.props访问传入参数，也可以通过this.state保存一个组件状态，每当组件状态改变时，render函数被重新调用(应该是在this.setState函数中回调render函数)

# app
```JS
var TodoList = React.createClass({
  render: function() {
    var createItem = function(itemText, index) {
      return <li key={index + itemText}>{itemText}</li>;
    };
    return <ul>{this.props.items.map(createItem)}</ul>;
  }
});
var TodoApp = React.createClass({
  getInitialState: function() {
    return {items: [], text: ''};
  },
  onChange: function(e) {
    this.setState({text: e.target.value}); //修改状态会导致render重调
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});
  },
  render: function() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />   //渲染列表
        <form onSubmit={this.handleSubmit}>     //提交函数
          //貌似只能在事件函数中拿用户输入? 
          <input onChange={this.onChange} value={this.state.text} /> 
          <button>{'Add #' + (this.state.items.length + 1)}</button>
        </form>
      </div>
    );
  }
});
React.render(<TodoApp />, mountNode); 
```
使用props和state，使用state保存添加的字符串列表(this.state.items)，以及正在输入的字符串(this.state.text)

# 使用外部插件
```JS
var MarkdownEditor = React.createClass({
  getInitialState: function() {
    return {value: 'Type some *markdown* here!'};
  },
  handleChange: function() {
    this.setState({value: React.findDOMNode(this.refs.textarea).value});
  },
  render: function() {
    return (
      <div className="MarkdownEditor">
        <h3>Input</h3>
        <textarea
          onChange={this.handleChange}
          ref="textarea"
          defaultValue={this.state.value} />
        <h3>Output</h3>
        <div
          className="content"
          dangerouslySetInnerHTML={{
            __html: marked(this.state.value, {sanitize: true})
          }}
        />
      </div>
    );
  }
});
React.render(<MarkdownEditor />, mountNode);
```
调用markdown插件渲染

