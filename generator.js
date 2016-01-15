'use strict'

// function* fib() {
//     var v1 = 0, v2 = 1;
//     console.log(yield v1);
//     console.log(yield v2);
//     while (true) {
//         v2 = v2 + v1;
//         console.log(yield v2);
//         v1 = v2 - v1;
//     }
// }

// var gen = fib();

// for (var i = 0; i < 10; i++) {
//     console.log(gen.next('get fib ').value);
// }

// 用setTimeout模拟某些异步操作
// function task () {
// 	console.log('do task1');
// 	// do task1
// 	setTimeout(function (result1) {
// 		console.log('on task1');
// 		console.log('do task2');
// 		setTimeout(function  (result2) {
// 			console.log('on task2');
// 			console.log('do task3');
// 			setTimeout(function (result3) {
// 				console.log('on task3');
// 			})
// 		}, 2000);
// 	}, 1000);
// };
// task();

var fs = require('fs');
var readFile = thunkify(fs.readFile);

function thunkify(fn){
	// 返回wrapper函数，wrapper函数不立刻执行fn,而仅仅是保存参数
	return function(){
	  var args = Array.prototype.slice.call(arguments);
	  var ctx = this;
	  // wrapper函数返回一个新函数,caller可以在新函数调用中设置done回调函数
	  return function(done){
	    args.push(function(){
	      done.apply(null, arguments);
	    });
	    try {
	      fn.apply(ctx, args);
	    } catch (err) {
	      done(err);
	    }
	  }
	}
};
function* task (param) {
	console.log('func arg:' + param);
	console.log('read file1');
	var ret1 = yield readFile('file1.txt');
	console.log('file1:' + ret1[1]);
	
	console.log('read file2');
	var ret2 = yield readFile('file2.txt');
	console.log('file2:' + ret2[1]);
	
	console.log('read file3');
	var ret3 = yield readFile('file3.txt');
	console.log('file3:' + ret3[1]);
	
	console.log('read file1~3');
	var ret4 = yield [readFile('file1.txt'), readFile('file2.txt'), readFile('file3.txt')];
	console.log('file1~3:' + ret4[0][1]+"|"+ret4[1][1]+"|"+ret4[2][1]);
	
	return "ret value:" + ret1[1] + ret2[1];
}

var co_call = function (flow, get_return) {
	var slice = Array.prototype.slice;
	// generator的参数
    var gen = flow(slice.call(arguments, 2));
    var next = function (data) {
        // data赋值给yield左值&从yield处执行flow知道下一个yield
        // 返回yield右值& ret.value是个thunk
        var ret = gen.next(data);
        if( ret.done ){
        	get_return(ret.value);
        	return;
        }
        //返回一组thunk函数?
        if (Array.isArray(ret.value)) {
            var count = ret.value.length;
            // 返回一个二维数组
            var results = [];
            ret.value.forEach(function (item, index) {
                item(function () {
                    count--;
                    results[index] = slice.call(arguments);
                    if (count === 0) {
                        next(results);
                    }
                });
            });
        }else {
            ret.value(function () {
                // 异步回调的所有返回值生成新数组，传给yield左值
                next(slice.call(arguments));
            });
        }
    }
    next();
};

co_call(task, function (ret) {console.log(ret)},'first_arg', 'second_arg');
