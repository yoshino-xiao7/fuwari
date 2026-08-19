---
title: "Endfield Suzuki Plugin v1.0 正式发布"
published: 2026-03-12T19:00:00+08:00
project: "endfield-yunzai"
summary: "基于 Endfield Cloud 的 Yunzai-Bot 终末地助手插件正式发布，支持绑定、签到、角色查询、基建、抽卡统计、理智提醒等完整功能。"
---

## 插件简介

**endfield-suzuki-plugin** 是一个适用于 Yunzai 系列机器人框架的**明日方舟：终末地**游戏助手插件，通过 [Endfield Cloud](https://endfield.suzuki.ink) 提供的统一 API 实现各项功能。

## 当前已实现功能

### 🔑 账号绑定
- **Token 一步绑定** — 私聊发送 `#终末地绑定 <token>` 即可完成
- **手机验证码绑定** — 两步验证，更安全
- **隐私保护** — 群聊中发送敏感信息时自动提醒私聊，并尝试撤回消息

### ⏰ 自动签到
- 支持自定义签到时间（默认每天 08:05）
- 为所有已绑定用户自动执行
- 签到时凭证过期会**自动刷新**并重试

### 🖼️ 信息查询
- **玩家资料卡** — 等级、理智、每日任务、武器/干员数量等
- **角色详情卡** — 立绘、等级、武器、技能、装备，全部图片渲染
- **帝江号基建** — 各房间等级、驻守干员、好感度
- **领地基建** — 区域等级、定居点、收集进度

### 🎰 抽卡统计
- 抽卡记录自动同步（首次约 10~30 秒）
- 支持按池名过滤（限定寻访、常驻寻访等）
- 统计内容：各池总抽数、6★ 数量、平均出金抽数、UP 不歪率
- 条形图颜色判定欧非：50 抽内🟢 / 50~70 抽🟡 / 70 抽以上🔴

### ⚡ 自动提醒
- **理智提醒** — 每 30 分钟检查，达到阈值时私聊提醒（默认 240）
- **每日任务提醒** — 每天 21:00 检查，未完成时私聊提醒

### ⚙️ 其他
- 兼容**锅巴面板**可视化配置
- 支持 `#终末地更新` / `#终末地强制更新` 管理员指令
- 完整帮助指令 `#终末地帮助`

## 安装方式

**GitHub：**
```bash
git clone https://github.com/yoshino-xiao7/endfield-suzuki-plugin ./plugins/endfield-suzuki-plugin/
```

**Gitee（国内线路）：**
```bash
git clone https://gitee.com/yoshino-xiao7/endfield-suzuki-plugin.git ./plugins/endfield-suzuki-plugin/
```

## 技术要点

- 基于 Yunzai-Bot 插件规范，模块化设计（apps/ 目录拆分各功能）
- API 请求统一封装，支持凭证自动刷新和重试机制
- 所有信息卡片采用 HTML 模板 + Puppeteer 图片渲染
- QQ↔bindingId 映射持久化存储

::github{repo="yoshino-xiao7/endfield-suzuki-plugin"}
