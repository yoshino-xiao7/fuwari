---
title: DeepSeek YukiRyou 更新：真的发出来了，还多了个工作区审阅
published: 2026-08-18T23:55:00+08:00
description: 记录 DeepSeek YukiRyou 的第二个发布日：发布流水线重构出多 runner 门禁、一口气发出 v0.1.1 和 v0.2.0 两个 Beta，以及今天最大的功能 Desktop Companion——账户余额、工作区文件树、Git 变更审阅和文件预览，还有它背后那一堆安全设计。
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

昨天的博客写的是"把壳做完"，今天这篇写"真的发出去了 + 加了个大功能"。

两天下来，DeepSeek YukiRyou 已经从 v0.1.0 走到了 v0.2.1-beta.1，公开 Beta 发了三个：

- v0.1.0-beta.1（昨天）：第一个公开 Beta，只有 ZIP；
- v0.1.1-beta.1（今天中午）：补上 DMG 和应用内更新；
- v0.2.0-beta.1（今天晚上）：Desktop Companion 工作区审阅，今天的大头。

仓库也顺便改了个更正经的名字：`deepseek-harness-desktop-yukiryou`。

## # 上午：发布流水线第一次见真章

昨天那套 `release:mac` 脚本是在本机跑的。今天上午把它搬上 GitHub Actions，改成多 runner 门禁，然后就被现实教育了一上午。

### 门禁链

现在发一个版本，要过这么一串：

```text
quality（版本号/发布说明检查）
  → build_candidate（签名、出候选包）
  → verify_candidate（全新 runner 装进 /Applications 真实启动）
  → soak_candidate（装好的应用跑 30 分钟健康探测）
  → notarize（公证）
  → verify_final（另一个全新 runner 验收 DMG 和 ZIP，要求公证票据）
  → release（创建 draft）
  → publish（独立工作流发布）
```

### 踩的坑

- **签名跨机器复制就坏**。本机签名完，拷到 CI runner 上 `codesign --verify` 直接不过。查了半天是签名在打包归档后变得不可移植，最后把签名改成确定性、可移植的，并在归档后专门验证一次。
- **fresh runner 是干净的**。CI 机器上啥都没有，跑集成测试之前得先把 runtime 准备好，不然上来就红。
- **公证要能恢复**。昨天设计的两段式（提交一次、存 state 走人）在 CI 上也得配套：专门加了个 `resume-macos-release.yml`，跑挂了能从上次的 state 继续，不会傻乎乎地重提一遍。
- **版本不可变**。quality gate 里直接检查：这个 tag 或 release 已经存在就拒绝。发布说明没写、写了 H1、或者没有中英双语，也拒绝。发出去的版本不允许覆盖。
- **一堆命名和渠道的细节**。GitHub asset 名不能用带空格的（`DeepSeek YukiRyou` → `DeepSeek.YukiRyou`）；beta 版本要发到 updater 的 beta channel，不然正式版用户会被推送测试版；发布前还要先验证 draft 目标存在，别发了个寂寞。

v0.1.1-beta.1 就是在这轮折腾里发出去的：DMG + ZIP，多台全新 runner 装到 /Applications 验收，跨机器复制后的签名稳定性也修了。

## # 晚上：v0.2.0-beta.1 —— Desktop Companion 工作区审阅

这才是今天真正的大功能。以前用 Harness，工作区里到底改了哪些文件、diff 长什么样，全靠猜；Agent 干了啥只能翻对话。今天给应用加了一个 **Desktop Companion 右栏**，把这些东西全摆到桌面上。

### 账户余额

Harness 的"设置"上方现在会显示当前凭据所属账户的余额（CNY/USD），走官方接口。这里有个克制：**只显示余额，不显示今日消费**——官方接口给不出精确的今日消费，硬猜没意义。

实现上是走官方 `sidebar.footer.action` 插槽离线注册的，主进程每次 Runtime 启动轮换 token，拉的是脱敏快照，密钥只在 Runtime 的 credential service 里解析。

### 文件树、变更和 diff

右栏是一整套工作区审阅：

- 当前工作区的文件树，懒加载；
- 相对 HEAD 的 Git 变更，目录化折叠，带增删行数；
- 单文件 diff：双侧行号、hunk、未修改行折叠、整行红绿背景；
- 文件预览：Markdown 支持排版/源码切换，纯文本和 PNG/JPEG/GIF/WebP 图片都能看；
- 官方"产物"行保留不动，下面新增逐轮变更卡——消费 Harness rc.7 的 tool 事件，只认成功的 mutation，升级前的旧轮次只回填官方 deliverables 路径，不伪造增删统计。

窗口够宽时预览和右栏并排，窄窗口进入 Review Focus，不 reload Harness。点开变更卡，主进程会重新核对当前 worktree 再打开只读 diff。

### 安全：这条线花的心思最多

桌面壳要碰用户的文件系统，这是把双刃剑，所以边界设计得很细：

- **独立 preload**。本地 shell 和 Harness 页面现在是两个完全独立的 preload 产物，文件审阅能力只在 shell 侧，Harness 页面摸不到。
- **Workspace Authority**。"当前工作区"不是 renderer 说了算：先通过官方 Session/Workspace store 识别上下文，再由带鉴权的 Runtime registry 复核归属；主进程复核通过才建立 Workspace Capability，renderer 只能提交随机节点 ID，不能提交 root、绝对路径或 shell 命令。
- **文件读取**。用 `O_NOFOLLOW` 句柄读取，读取前后校验文件身份，防止读到一半文件被换掉；非法 UTF-8 直接拒绝，不渲染替换字符。
- **SafeMarkdown**。Markdown 预览只消费白名单结构：HTML、SVG/MathML、远程图片、iframe、事件属性、`javascript:` 链接，全部当普通文本显示，绝不执行。
- **图片像素炸弹**。解码前限制单边尺寸和总像素，避免一张超大的图把 renderer 拖死。
- 切换工作区会立刻关掉旧预览、清空 preload 缓存的正文和图片 data URL。

### Runtime 也升了

内置 Harness 从 rc.6 升到 **rc.7**，带来 node-pty、sharp、koffi 这些原生依赖。新增的门禁逐项验证：arm64 原生装配、真实 PTY 往返、sharp/koffi 探针、发布包里 `pty.node` 和 `spawn-helper` 的架构一致性。`runtime:verify` 现在还会拒绝残留的旧 Runtime。

### 测试数字见长

```text
Unit:        71 passed
Integration: 21 passed
E2E arm64:   3 passed
Stress:      100/100
Companion:   100/100（审核/切换/收起展开状态循环）
Memory:      2500/2500（working set 480.2 → 476.9 MiB，无线性增长）
Upgrade:     0.1.0 布局升级通过（Runtime Home 与 settings 字节保留）
```

2500 次侧栏/标签长会话内存门禁，working set 不涨反降，这个我很满意。发布门禁里那个 30 分钟 soak，60 秒资格版本已经过了，正式版跑在异机安装和公证之间；独立 5 小时扩展 soak 支持手动和每周低峰触发，不阻塞普通 Beta。

## # 深夜：v0.2.1-beta.1 在准备

晚上十一点之后还在改更新相关的体验，几个提交全是 v0.2.1 的内容：

- **下载状态误报**。之前下载更新的时候界面显示的是"检查中"，等得人一头雾水。现在下载阶段有不定进度动画和明确的"下载中"状态。
- **签名验证失败卡死**。macOS 校验更新签名失败时，应用之前会一直停在失败状态。现在会明确提示，并给出官方已公证 DMG 的下载入口——注意是下载官方 DMG，不是绕过系统签名验证，这个底线没动。
- **更新入口位置**。固定在展开后的品牌行里，不再出现在交通灯下方的空白工具栏。

## # 双语文档和路线图

晚上还补了一批文档：新增独立英文 README（`README_EN.md`，中英文首页互切），GitHub Release Notes 改成同一文件里同时放简体中文和英文，应用内"关于"的描述也做了双语。

顺便把产品路线图画清楚了，免得 README 里什么都像"已上线"：

- **DeepSeek 宠物**：开发中，等角色素材冻结后进高帧率动画；
- **手机远程控制**：规划中，明确配对和权限边界后再做；
- **插件市场**：规划中，设计好签名、来源验证、兼容性和回滚边界后再开放；
- 通知功能继续延期——Harness 还是没有稳定的任务事件接口。

## # 小结

两天，三个公开 Beta。昨天是把"能做出来"走通，今天是"能发出去"和"好用一点"：

1. 发布从本机脚本变成了多 runner 门禁流水线：版本不可变、全新机器验收、公证可恢复；
2. Desktop Companion 落地：余额、文件树、Git 变更审阅、文件预览，全部只读；
3. 安全边界认真做了：独立 preload、Workspace Authority、O_NOFOLLOW、SafeMarkdown、像素炸弹防护；
4. 中英双语文档和明确的路线图。

还没做的也摆着：宠物动画在等素材、插件市场和手机控制还在规划、通知仍然延期；CI 的 Secrets 还没配，下一步是把"出包"也彻底交到 CI 手里。

仓库（已改名）：

::github{repo="yoshino-xiao7/deepseek-harness-desktop-yukiryou"}
