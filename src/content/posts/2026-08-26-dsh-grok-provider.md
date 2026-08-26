---
title: 新项目 dsh-grok-provider：给 DeepSeek Harness 接上官方 Grok Build
published: 2026-08-26T14:19:37+08:00
description: 今天把社区 Grok Build Provider 发到了 0.1.1。登录走官方 CLI 的浏览器 OAuth，模型动态发现，额度面板不造假，插件自己不存第二份 token。
tags:
  - DeepSeek
  - Grok
  - 独立开发
  - npm
category: 开发
draft: false
lang: zh-CN
---

## # 前言

上一篇还在写 DeepSeek YukiRyou 的插件市场。今天换了个仓库，把另一件事真正发出去了：**dsh-grok-provider**。

一句话：让 DeepSeek Harness 用你已经登录的官方 Grok Build 账号——动态模型、流式推理、工具调用、额度面板。当前版本 `0.1.1`，npm 上能装。

这不是桌面壳的功能补丁，是一个独立的社区 Provider。非官方，和 xAI、DeepSeek Harness 都没有隶属关系。

## # 为什么要另开一个项目

Grok Build 订阅已经能写代码了，但 Harness 默认那条 `xai` 路由是按量 API，跟订阅不是一回事。社区里也有不少"把 Grok 接到 DSH"的插件，常见做法是自己做 OAuth、自己存 token、再维护一份模型白名单。

我不太想走那条路。

v0.2.2 之后，YukiRyou 明确转向 Plugin-first：能做成插件的，就不要再给 Harness 打 DOM 补丁。Grok 这条能力正好适合独立出去——桌面应用负责受管安装和目录校验，Provider 自己管登录、模型和请求协议。

更具体一点，我给自己立了几条硬约束：

1. **不实现第二套 OAuth**。登录就是调用官方 `grok login --oauth` 打开浏览器，凭据仍由官方 CLI 写进 `~/.grok`。
2. **不维护静态模型白名单**。运行时读当前账号可见的全部 Grok Build 模型。
3. **不知道的东西就失败关闭**。新 backend 映射不了，发现过程直接失败，而不是偷偷滤掉再宣称"全部支持"。
4. **额度不能造假**。上游没给够信息就显示未知，OAuth token 过期时间绝不当成额度刷新时间。

这些约束写进威胁模型和产品需求之后，代码才开始长。clean-room 实现，不抄现有社区插件的认证路径。

## # 它现在能做什么

| 能力 | 实际做法 |
| --- | --- |
| 登录 | 官方 CLI 打开浏览器；插件不实现 OAuth grant |
| 凭据 | 复用 `~/.grok`（Windows 是 `%USERPROFILE%\.grok`），不另存一份 token |
| 模型 | 动态发现，不写死 grok-4.6 / grok-4.5 |
| 对话 | Responses 流式文本、reasoning、加密 reasoning replay、usage、finish reason |
| 工具 | function call 交回 Harness 权限层，Provider 自己不执行 |
| 面板 | 登录状态、每周/月额度、重置时间、模型能力与 reasoning 档位 |
| 界面 | Web 设置页中英切换；TUI 只有闭合的 `/grok` 命令 |

设置页在 **设置 → Grok Build**。点"使用 Grok 登录"，官方 CLI 弹浏览器，授完权回来刷新面板，再在模型选择器里挑当前账号能看到的模型。不会让你粘贴 access token 或 refresh token。

TUI 这边：

```text
/grok status
/grok login
/grok cancel
/grok logout
```

这几条不会进模型上下文。退出要二次确认——因为它会调官方 `grok logout`，同一份 Grok home 下的其他客户端也会被登出。

## # 今天怎么发的：0.1.0，然后立刻 0.1.1

上午先把 `0.1.0` 推上 npm：clean-room Provider、动态目录、流式工具调用、账户面板，macOS arm64 真机验收过。Windows x64 有代码和 CI，真机验收明确写成"发布后再做"。

发完一看，包里的中英文 README、安全策略和维护文档还留着"首发前"的措辞，安装方式、兼容性、Windows 状态和项目来源对不上。发布路径也还是一次性的 npm token。

于是同天下午出了 `0.1.1`。运行时协议没改，改的是发布和文档：

- 把 README / SECURITY / 维护文档里的状态全部改成发布后的事实；
- 后续 npm 发布改走 GitHub Actions + npm Trusted Publisher OIDC，工作流不再读 `NPM_TOKEN`；
- 加了强制逐版检查表：双语文档、版本对齐、唯一 tarball、完整性、provenance、Registry 回读、明确发布授权；
- 仓库加上 `dsh-plugin` / `dsh` Topics，精确版本进了 YukiRyou 受管 catalog（目前只标已验证的 macOS arm64）。

首发 token 已经撤掉。这种事不适合拖到"下个功能版本再顺手改"。

## # 安全边界我比较较真

插件会有界读取官方 `auth.json`——那个文件里可能有 refresh token。解析器不用、不缓存、不持久化 refresh token，只留校验需要的元数据和短期 access-token lease。

凭据快过期时，只能有界调用一次官方 `grok models`，再重新读并验证官方文件。插件自己不跑 OAuth refresh grant。

另外几条也写死了：

- 模型、目录、计费请求只打编译时固定的 HTTPS origin/path，拒绝重定向；
- Renderer 和 RPC 收不到 token、`user_id`、凭据路径、任意 URL 或原始上游响应；
- 登录子进程用固定 argv、过滤环境、输出上限、deadline 和取消处理，不走 shell；
- 提示词和工具结果会发给 xAI，但插件自己不往日志里写这些内容。

额度面板有个容易踩的坑：protobuf 计费在完整 weekly/monthly 周期里会省略零值百分比。这种情况恢复成"已使用 0% / 剩余 100%"；其他残缺响应保持未知。不完整就说不知道，比编一个数字好看。

## # 怎么装

环境先对齐：

- DeepSeek Harness `0.1.1-rc.2`
- Node.js `>= 24.19.0`
- macOS arm64（已真机验收）或 Windows x64（代码支持，真机还没验）
- 官方 Grok Build CLI **精确** `1.0.5 (5115b46bc909)`

CLI 请走 [Grok Build 官方文档](https://docs.x.ai/build/overview)。装完先确认：

```sh
grok --version
grok models
```

再装 Provider：

```sh
dsh plugin --profile web add dsh-grok-provider@0.1.1
dsh web
```

插件只认官方默认的 Grok home，不会从 PATH、工作区或设置页里随便指定的路径加载可执行文件。CLI 版本对不上就失败关闭，不会跳过检查。

YukiRyou 桌面里也可以从"YukiRyou · 实机验证"来源看到这个精确版本。目录只提供发现，不是代码审计，更不是官方背书。

## # 明确没做的

首版范围收得很死：

- 没有图片输入、Web/X Search、任意文件下载；
- 没有 API Key 模式、多账号、企业 OIDC；
- 没有 ACP 或 Headless agent 封装；
- macOS x64 和 Linux 不支持；
- Windows x64 的首次 Registry 真机验收还在发布后跟进。

卸载插件不会删官方 Grok CLI，也不会直接改或删 `auth.json`。

## # 小结

今天这个仓库从"能跑"变成了"能被别人按精确版本装上"：

1. **独立 Provider**：官方 CLI 管登录，Harness 管工具权限，插件只管协议和面板；
2. **动态模型 + 失败关闭**：不写死名单，映射不了就停，不装看不见；
3. **额度不造假**：完整周期的零值能恢复，其余未知就未知；
4. **发布链路收口**：`0.1.0` 首发，`0.1.1` 把文档和 Trusted Publisher 补齐。

下一步是 Windows 真机验收，以及按已验证的 Harness / xAI 协议逐项评估更多内容类型。路线图不是兼容性承诺，新能力还是得过文档决策和安全门禁。

仓库、npm 和发行页：

::github{repo="yoshino-xiao7/dsh-grok-provider"}

npm：[dsh-grok-provider@0.1.1](https://www.npmjs.com/package/dsh-grok-provider/v/0.1.1)
