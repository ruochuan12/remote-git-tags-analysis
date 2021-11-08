# 领导问：怎么用JS获取git仓库的标签

## 1. 前言

>大家好，我是[若川](https://lxchuan12.gitee.io)。欢迎关注我的[公众号若川视野](https://lxchuan12.gitee.io)，最近组织了[源码共读活动](https://juejin.cn/pin/7005372623400435725)，感兴趣的可以加我微信 [ruochuan12](https://juejin.cn/pin/7005372623400435725) 参与，如今已进行三个月，大家一起交流学习，共同进步，很多人都表示收获颇丰。

想学源码，极力推荐之前我写的[《学习源码整体架构系列》](https://juejin.cn/column/6960551178908205093) 包含`jQuery`、`underscore`、`lodash`、`vuex`、`sentry`、`axios`、`redux`、`koa`、`vue-devtools`、`vuex4`、`koa-compose`、`vue 3.2 发布`、`vue-this`、`create-vue`、`玩具vite`等10余篇源码文章。

[本文仓库 open-analysis，求个star^_^](https://github.com/lxchuan12/open-analysis.git)

最近组织了[源码共读活动](https://juejin.cn/pin/7005372623400435725)，大家一起学习源码。于是搜寻各种值得我们学习，且代码行数不多的源码。

我们经常遇到类似场景：**每次启动项目的服务，电脑竟然乖乖的帮我打开了浏览器**。当然你也可能没有碰到过，但可能有这样的需求。而源码300行左右，核心源码不到100行。跟我们工作息息相关，非常值得我们学习。

阅读本文，你将学到：

```js
1. Node 加载采用什么模块
2. 学会调试看源码
3. 学会面试考点 promisify 的原理和实现
4. 等等
```



## 源码

### package.json

```js
// package.json
{
  // 指定 Node 以什么模块加载，缺省时默认是 commonjs
	"type": "module",
	"exports": "./index.js",
  // 指定 nodejs 的版本
	"engines": {
		"node": "^12.20.0 || ^14.13.1 || >=16.0.0"
	},
	"scripts": {
		"test": "xo && ava"
	}
}
```

众所周知，`Node` 之前一直是 `CommonJS` 模块机制。 `Node 13` 添加了对标准 `ES6` 模块的支持。

告诉 `Node` 它要加载的是什么模块的最简单的方式，就是将信息编码到不同的扩展名中。
如果是 `.mjs` 结尾的文件，则 `Node` 始终会将它作为 `ES6` 模块来加载。
如果是 `.cjs` 结尾的文件，则 `Node` 始终会将它作为 `CommonJS` 模块来加载。

对于以 `.js` 结尾的文件，默认是 `CommonJS` 模块。如果同级目录及所有目录有 `package.json` 文件，且 `type` 属性为`module` 则使用 `ES6` 模块。`type` 值为 `commonjs` 或者为空或者没有 `package.json` 文件，都是默认 `commonjs` 模块加载。

关于 `Node` 模块加载方式，在《JavaScript权威指南第7版》16.1.4 Node 模块 小节，有更加详细的讲述。此书第16章都是讲述`Node`，感兴趣的读者可以进行查阅。

### 源码

[npm 包描述信息](https://npm.im/remote-git-tags)

```js
import {promisify} from 'node:util';
import childProcess from 'node:child_process';

const execFile = promisify(childProcess.execFile);

export default async function remoteGitTags(repoUrl) {
	const {stdout} = await execFile('git', ['ls-remote', '--tags', repoUrl]);
	const tags = new Map();

	for (const line of stdout.trim().split('\n')) {
		const [hash, tagReference] = line.split('\t');

		// Strip off the indicator of dereferenced tags so we can override the
		// previous entry which points at the tag hash and not the commit hash
		// `refs/tags/v9.6.0^{}` → `v9.6.0`
		const tagName = tagReference.replace(/^refs\/tags\//, '').replace(/\^{}$/, '');

		tags.set(tagName, hash);
	}

	return tags;
}
```

## node:util

[mdh 19期](https://www.yuque.com/mdh/weekly/grwegg#7dfb9dcd)

[](https://simonplend.com/whats-new-in-node-js-core/)

引用 node 原生库可以加 node: 前缀，比如 `import url from "node:url"`

## promisify async

### 源码

### 源码

[es6-promisify](https://github.com/mikehall314/es6-promisify)

```js
const kCustomPromisifiedSymbol = SymbolFor('nodejs.util.promisify.custom');
const kCustomPromisifyArgsSymbol = Symbol('customPromisifyArgs');

let validateFunction;

function promisify(original) {
  // Lazy-load to avoid a circular dependency.
  if (validateFunction === undefined)
    ({ validateFunction } = require('internal/validators'));

  validateFunction(original, 'original');

  if (original[kCustomPromisifiedSymbol]) {
    const fn = original[kCustomPromisifiedSymbol];

    validateFunction(fn, 'util.promisify.custom');

    return ObjectDefineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
  }

  // Names to create an object from in case the callback receives multiple
  // arguments, e.g. ['bytesRead', 'buffer'] for fs.read.
  const argumentNames = original[kCustomPromisifyArgsSymbol];

  function fn(...args) {
    return new Promise((resolve, reject) => {
      ArrayPrototypePush(args, (err, ...values) => {
        if (err) {
          return reject(err);
        }
        if (argumentNames !== undefined && values.length > 1) {
          const obj = {};
          for (let i = 0; i < argumentNames.length; i++)
            obj[argumentNames[i]] = values[i];
          resolve(obj);
        } else {
          resolve(values[0]);
        }
      });
      ReflectApply(original, this, args);
    });
  }

  ObjectSetPrototypeOf(fn, ObjectGetPrototypeOf(original));

  ObjectDefineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return ObjectDefineProperties(
    fn,
    ObjectGetOwnPropertyDescriptors(original)
  );
}

promisify.custom = kCustomPromisifiedSymbol;
```

很容易成为面试考点。

[](https://github1s.com/nodejs/node/blob/master/lib/internal/util.js#L343)

## git ls-remote --tags

[](https://git-scm.com/docs/git-ls-remote)

## Map

`for of` 正则，解构赋值

## 应用场景

## 总结
