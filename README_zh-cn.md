# HyperMimic 打包器

[English](README.md) | 简体中文

https://hypermimic.netlify.app/packager

将 Scratch 项目转换为 HTML 文件、zip 压缩包，或适用于 Windows、macOS 和 Linux 的可执行程序。

## 开发

安装依赖：

```
npm ci
```

以开发模式启动：

```
npm start
```

然后访问 http://localhost:8947。手动刷新即可看到更改。

在开发模式下生成的打包项目不应分发。相反，你应该运行生产构建，以显著减小网站和打包器的文件大小。

```
npm run build-prod
```

输出将位于 `dist` 文件夹中。

`src` 的大致结构如下：

 - packager：负责下载和打包项目的代码。
 - p4：打包器的 Svelte 网站。“p4”是打包器内部用来指代自己的名称。
 - scaffolding：一个极简的 Scratch 项目播放器。处理运行 Scratch 项目的大部分繁琐细节，例如处理鼠标输入。
 - common：scaffolding 和 packager 共同使用的一些文件。
 - addons：可选附加组件，例如游戏手柄支持或指针锁定。
 - locales：翻译。en.json 包含原始英文消息。其他语言由志愿者翻译，并通过自动化脚本导入。（[你可以帮忙](https://docs.turbowarp.org/translate)）
 - build：各种构建时脚本，例如 webpack 插件和加载器。

## 给分支（fork）的提示

我们努力让打包器易于分支，即使是不基于 TurboWarp 的修改版也是如此。阅读本节（至少前半部分）应该会让你更容易做到这一点。

### 软件包

如果你想更改所使用的 scratch-vm/scratch-render/scratch-audio/scratch-storage/等，这很简单：

 - 对你的包执行 `npm install` 或 `npm link`。包名无关紧要。
 - 更新 src/scaffolding/scratch-libraries.js，以你使用的名称导入这些包。（我们的一些包带有 `@turbowarp/` 前缀，而另一些仍然只是 `scratch-vm` —— 只需确保它们与你的名称匹配即可）

然后重新构建即可。你甚至可以安装一个原版 scratch-vm，所有核心功能仍可正常工作（但诸如插值、高质量画笔、舞台大小等可选功能可能无法工作）

请注意，npm 是一个非常容易出错的软件，而且我们的依赖树非常庞大。有时你可能会遇到关于缺少依赖项的报错，运行 `npm install` 后这些错误应该会消失。

### 部署

打包器作为一个简单的静态网站进行部署。构建完成后，只需复制 `dist` 文件夹，你就可以将其托管在任何地方。

我们使用 GitHub Actions 和 GitHub Pages 来管理部署。如果你想这样做：

 - 在 GitHub 上 fork 该仓库并推送你的更改。
 - 在 GitHub 上进入你的 fork 的设置，启用 GitHub Pages，并将来源设置为 GitHub Actions。
 - 进入“Actions”选项卡，如果 GitHub Actions 尚未启用，请启用它。
 - 将提交推送到“master”分支。
 - 几分钟后，你的网站将自动构建并部署到 GitHub Pages。

### 品牌

我们请求你至少花点时间，通过编辑 `src/packager/brand.js` 来重命名网站，填入你自己的应用名称、链接等。

### 大型文件

大型文件（例如 NW.js、Electron 和 WKWebView 可执行文件）存储在本仓库之外的外部服务器上。虽然我们不会主动删除旧文件（该服务器仍提供自 2020 年 11 月以来未使用的文件），但我们不能保证它们会永远存在。打包器使用安全校验和来验证这些下载。分支可以自由使用我们的服务器，但如果你愿意，也很容易搭建自己的服务器（它只是一个静态文件服务器；更多信息请参见 `src/packager/large-assets.js`）。

### Service Worker

将环境变量 `ENABLE_SERVICE_WORKER` 设置为 `1`，以启用 Service Worker 实现离线支持（实验性功能，并非 100% 可靠）。不建议在开发环境中使用。我们的 GitHub Actions 部署脚本默认使用此设置。

## 独立构建

打包器支持生成“独立构建”，即包含整个打包器的单个 HTML 文件。诸如 Electron 二进制文件之类的大型文件仍会根据需要从远程服务器下载。你可以从[我们的 GitHub 发布页面](https://github.com/Hyper-Mimic/packager/releases)下载预构建的独立版本。当我们的网站被屏蔽，或者你没有可靠的互联网连接时，这些会很有用。请注意，独立构建不包含更新检查器，因此请偶尔自行检查。

要在本地制作生产独立构建：

```
npm run build-standalone-prod
```

构建输出到 `dist/standalone.html`。

## Node.js 模块和 API

有关 Node.js API 文档，请参见 [node-api-docs/README.md](node-api-docs/README.md)。

要在本地构建 Node.js 模块：

```
npm run build-node-prod
```

## 许可证

<!-- 请确保同时更新 src/packager/brand.js 中的 COPYRIGHT_NOTICE -->

Copyright (C) 2021-2024 Thomas Weber
Copyright (C) 2026 Clyain

本源代码受 Mozilla Public License 2.0 版条款约束。如果本文件未附带 MPL 副本，你可以在 https://mozilla.org/MPL/2.0/ 获取一份。