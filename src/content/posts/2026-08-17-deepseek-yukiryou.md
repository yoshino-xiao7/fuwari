---
title: DeepSeek YukiRyou：把 DeepSeek Harness 装进一个真正的 Mac 应用
published: 2026-08-17T22:00:00
updated: 2026-08-18T23:51:00
description: 记录 DeepSeek YukiRyou 从零到可发布的一天：Electron 桌面壳怎么搭的、运行时为什么要固定内置、故障怎么自恢复、启动页和设置页怎么做的，以及晚上被 Apple 公证教育出来的两段式发布流水线。
tags:
  - macOS
  - Electron
  - DeepSeek
  - 独立开发
category: 开发
draft: false
lang: zh-CN
---

## # 前言

先交代一下今天干了啥：我把 DeepSeek Harness 打包成了一个正经的 macOS 应用，叫 **DeepSeek YukiRyou**。下午两点多写到晚上九点多，9 个提交，从零到一个能签名、能公证、能自动更新的桌面应用。

为什么做这个？说白了，Harness 本身是个 Web UI，用是能用，但"能用"和"像个应用"差得挺远：要自己装 Node、记启动命令、管端口，进程挂了还得自己发现。我就想把这一堆破事全收进一个 `.app` 里——双击打开就能干活，关掉窗口进程自己回收，崩了还能自己爬起来。

它不是 Harness 的重写，Agent 该怎么跑还怎么跑，我干的只是外壳那层。

---

## # 第一笔提交：一口气把骨架全铺开

下午的第一笔提交叫 `feat: launch DeepSeek YukiRyou for macOS`，一次就把整个工程的骨架全铺开了，后面所有东西都是在这上面长的。

### 为什么是 Electron

其实没啥好纠结的，想在 macOS 上做这种壳基本就 Electron 了。倒是三个架构决策我写成了 ADR，免得以后自己忘了当初为什么这么选：

1. 用 Electron 做 macOS 壳；
2. 运行时原子固定，版本跟着应用走，不依赖用户机器上的环境；
3. 不走 Mac App Store，自己分发。

第 2 条是核心。应用不能指望用户装了 Node 18 还是 24，所以运行时是内置的、固定版本的：Node `24.19.0`、`@deepseek-ai/dsh` `0.1.0-rc.6`、pnpm `10.34.5`，Electron 是 `43.4.0`。

装配脚本 `runtime:vendor` 干的事挺朴素但挺重要：按架构装好运行时，**核对 Node 的 SHA-256**，跑一次版本冒烟，最后原子替换资源目录——中途失败不会留个半成品。说到底就是怕下到一个被改过的 Node，也怕装到一半停电留下个坏目录。

### RuntimeSupervisor

Harness 是子进程，我给它配了个 `RuntimeSupervisor` 专门管生死：

- 端口用随机回环端口，只在 `127.0.0.1` 上，不往局域网暴露；
- 就绪是真 HTTP 探测出来的，不是"进程起来了就当好了"；
- 退出时按进程组回收，不留孤儿进程；
- 失败分了类：`spawn-failed`、`exited-before-ready`、`unexpected-exit`、`startup-timeout`、`renderer-crashed`，每种都有对应处理。

窗口那边第一天就把安全配置拉满了：`sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`，只允许 Harness 自己的 origin，外链一律丢给系统浏览器。外观用的 `hiddenInset` 原生交通灯加 44px 本地顶栏，Harness 页面放在下面的 `WebContentsView` 里。顶栏背景要跟着侧栏的展开收起走，我让 preload 里一个 `ResizeObserver` 逐帧跟着，不然拖一下侧栏顶栏就穿帮。

---

## # 然后开始折腾"出事了怎么办"

骨架有了，接下来一整个下午都在想同一个问题：万一它坏了呢。三个提交全在干这个。

### 诊断包（16:50）

日志先做了轮转，2 MiB 一转，留 3 份。然后做了个诊断导出，故障页和菜单里都能导出 ZIP。这里有个我比较坚持的点——包必须脱敏，只有环境摘要和有界日志，不带项目源码、会话和凭据，不然用户根本不敢往 issue 里贴。

### settings.yaml 坏了怎么办（16:57）

Harness 的 `settings.yaml` 一旦被写坏，整个应用直接起不来，这属于"没遇到不知道多痛"的坑。现在的做法是启动时先校验：

1. YAML 解析带 `prettyErrors`，语法错了或者根节点不是 map 都算坏；
2. 坏了不直接覆盖，原文件改名存成 `settings.yaml.corrupt-<时间戳>` 留着；
3. 新建一份权限 `0600` 的空设置，弹个提示告诉用户；
4. 会话、凭据、工作区数据一概不动。

### 恢复策略（17:27）

- 运行时意外退出最多自动重启两次，退避 `[250, 1000]` ms；
- 本地顶栏和 Harness renderer 各有独立的 30 秒恢复预算——我最烦的就是一个区域崩了整个窗口跟着陪葬，所以两块互相独立，谁崩了都不许把对方带下去。这个我是真在打包后的应用里强制崩溃验证过的：顶栏崩了重放侧栏宽度和主题快照，Harness 崩了只管自己。

---

## # 品牌化：启动页、外观、关于

功能齐了之后，就剩"它得有个样子"。17:52 那笔提交把启动页和设置页都做了。

启动页用的最近比较火的 DeepSeek 女仆图标，柔光呼吸轨道、三段加载、状态文案轮换。失败的时候动画停下来，留重试和诊断入口。还有个细节：系统开了"减少动态效果"的话动画直接关掉——用户明确说了不要动效，那就别硬来。

设置页是有点东西的：居然能通过 Harness 官方的 `settings.section` 插槽离线注册两个页面。

- **外观**：浅色/深色/跟随系统，复用 Harness 官方主题服务，原生持久化；主题解析出来之后通过受限桥同步到本地顶栏，给以后的风格注入留了个口子。
- **关于**：品牌区、版本号、开发者链接、更新中心。

更新这块的原则就俩字：不打扰。正式版启动 15 秒后自动查一次，之后每 6 小时复查；只有真的在下载或待安装的时候，品牌行才冒出一个紧凑的更新入口，其余状态一律不显示。下载完用户确认才重启安装。开发构建直接禁用更新，连更新服务都不连。

---

## # 公证：今天最折磨人的一段

功能都是下午写的，晚上全耗在签名加公证上。四笔提交，全在修同一件事，这个必须单独说说。

### 第一版：老老实实等着（19:30）

`release: standardize notarized macOS packaging` 写了 311 行的 `scripts/release-macos.ts`，把整条链路固化成一条命令：要求干净的 Git 工作区（发布的东西必须和源码对得上）、打包 arm64 的 `.app`、清扩展属性、Developer ID 签名、组装 DMG（带 `/Applications` 软链）、DMG 也签、`hdiutil verify`，最后 `notarytool submit` 提交公证。

### 第二版：等不起了（19:48）

然后我就被 Apple 公证教育了。公证是真的慢，几分钟起步，而且网络一抖就失败。长连接挂着等结果，终端一断就前功尽弃，急了还可能重复提交同一个文件——Apple 那边是拒绝的。

所以第二版拆成了两段：

- `pnpm release:mac`：只提交一次，把 Submission ID 连同版本、Git 提交、产物路径写进 `notarization-state.json`（`0600` 权限），打印完直接退出。要是 state 文件还在，说明上次没弄完，直接拒绝再提交。
- `pnpm release:mac:finish`：拿同一个 ID 去查，还在处理中就立刻返回；只有 `Accepted` 了才继续后面的步骤。

说白了就是：慢的东西就别干等，存个凭证先跑路。

### 第三、四版：产物别丢 + 上传别抖（21:36 / 21:53）

拆开之后又踩了两个坑：

- 签好的 App 和 DMG 一开始放在临时目录，几小时后 finish 的时候文件没了。现在工作产物持久放在 `~/Library/Application Support/DeepSeek YukiRyou/Release Work` 里，state 文件记着路径，失败了现场也留着。
- 上传偶尔失败，后来加了 `--no-s3-acceleration` 走更稳的端点，消停了。

Accepted 之后的收尾其实没啥花样，就是一遍遍校验：`stapler staple` 两个包，`codesign --verify --deep --strict`、`spctl --assess`、`stapler validate`、`hdiutil verify` 全来一遍，然后从已 staple 的 App 派生更新 ZIP，生成 `SHA256SUMS.txt` 和 `release-manifest.json`——版本、架构、Git 提交、Submission ID、校验值全记上，哪天想对账都找得到。

---

## # 测试：倒没怎么费劲

测试这块其实挺顺的，因为从一开始就是"实现 + 测试"成对写的：

```text
Unit:        38 passed
Integration: 6 passed
E2E arm64:   2 passed（完整 UI 契约 + 双 renderer 强制崩溃恢复）
Stress:      100/100 passed（启动、就绪、停止、端口回收）
```

比较得意的是那个 fake Harness fixture：E2E 里放一个假的 Harness 服务，能精确控制它什么时候"猝死"，恢复路径就是这么逼出来的。打包后的 `.app` 也用 Playwright 真实跑过。8 小时 soak 的入口写好了，日常冒烟过，就等发布候选冻结后跑完整时长。

顺带一提，依赖审计的时候发现内置 pnpm `10.33.2` 有个高危公告，升到了 `10.34.5`，现在运行时生产依赖 0 个已知漏洞。

---

## # 小结

一天、9 个提交，从下午两点多到晚上九点多，DeepSeek YukiRyou 从零走到了能签名、能公证、能更新的状态。当前产物（未签名开发构建，本机验证用）：

```text
out/DeepSeek YukiRyou-darwin-arm64/DeepSeek YukiRyou.app
out/make/DeepSeek YukiRyou-0.1.0-arm64.dmg
out/make/zip/darwin/arm64/DeepSeek YukiRyou-darwin-arm64-0.1.0.zip
```

正式对外发还差三样东西：Apple Developer 证书、App Store Connect API Key（或 Keychain 公证 profile）、更新包托管地址。流水线已经把位置留好了，拿到就能发。

没做完的也记着：8 小时 soak 还没实跑；x64 的 E2E 没跑（手头都是 Apple Silicon）；还有通知功能我直接砍了——Harness 没有稳定的任务事件接口，用 DOM 文本猜测太容易误报，与其做出来天天误报，不如不做。

项目开源了，欢迎来逛：

::github{repo="yoshino-xiao7/deepseek-harness-desktop-yukiryou"}
