# AGENTS.md — fuwari 博客内容维护规范

本仓库是基于 Fuwari 主题定制的个人博客（Astro 5 + Svelte 5 + Tailwind CSS + pnpm）。本文档约束所有博客内容（文章、日志、配图）的写法，所有新增或修改内容的操作都应遵循。

## 内容目录

- 博客文章：`src/content/posts/`（*.md）
- 项目日志：`src/content/devlogs/`（*.md，版本更新/项目日志）
- 静态页面：`src/content/spec/`（about、privacy）
- 配图：`src/content/assets/images/`（正文引用的图片；`public/` 放站点级静态资源）

## 常用命令

```bash
pnpm new-post <slug>   # 新建文章骨架（自动生成 frontmatter，published 为当前时间）
pnpm lint              # Biome 静态检查（只检查）
pnpm format            # Biome 自动格式化
pnpm type-check        # TypeScript 检查
pnpm build             # 完整构建（会校验 frontmatter schema）
pnpm clean             # 清理未被引用的配图（默认 dry-run；加 -- --write 才删除）
```

## 文章 frontmatter（src/content/posts）

schema 定义在 `src/content/config.ts`。必填：`title`、`published`。可选：`updated`、`description`、`image`、`tags`、`category`、`lang`、`pinned`、`draft`。

```yaml
---
title: 文章标题
published: 2026-07-31T22:00:00+08:00  # ISO 时间，必须带时区偏移
updated: 2026-08-01T10:00:00+08:00    # 可选，修订时更新
description: 一两句话摘要
image: ../assets/images/xxx.jpg       # 可选，封面图
tags: [标签A, 标签B]
category: 日常                         # 常用值：日常 / 开发 / 技术分享 / 建站分享 / 技术
lang: zh-CN
pinned: false
draft: false
---
```

注意：

- `published` 必须是合法的日期值，且**必须带时区偏移**（如 `+08:00`）；`pnpm new-post` 已自动生成带偏移的时间戳。不带时区的时间戳会被 js-yaml 按 UTC 解析，归档按东八区显示时日期会整体晚一天。
- 文件名惯例：时间性文章用 `YYYY-MM-DD-<slug>.md`；长期有效文章可直接用 `<slug>.md`。
- 更新已有文章时：修改内容后把 `updated` 更新为当前时间；若改了标题/描述，检查分类与标签是否仍准确。
- `draft: true` 的文章不会发布，适合未完成的内容。

## 项目日志 frontmatter（src/content/devlogs）

必填：`title`、`published`、`project`（项目 ID，如 `xueliangyun` 或 `endfield-yunzai`）。可选：`summary`。

```yaml
---
title: "雪涼云 2.6.0 更新日志：AI 绘图 Beta 上线"
published: 2026-06-27T22:30:00+08:00
project: "xueliangyun"
summary: "一句话概括本次更新"
---
```

## 配图

- 新图放入 `src/content/assets/images/`，文件名用日期+描述（如 `2026-07-31-xxx.png`），不要用随机哈希名。
- 正文引用：`![描述](../assets/images/xxx.png)`（相对 posts/ 目录）。
- 封面：frontmatter `image: ../assets/images/xxx.jpg`。
- 删除图片前先确认没有文章引用；可用 `pnpm clean` 找出未引用图片。

## 写作风格

- 默认简体中文（`lang: zh-CN`）。
- 正文标题用 `## # 标题` 形式（与现有文章一致，如 `## # 前言`、`## # 小结`）。
- 章节式结构：前言/背景 → 过程 → 结果/小结；日常记录可口语化，开发记录偏技术细节。
- 代码块可标注语言；项目相关文章注意术语一致（如 雪涼云、Yunzai、米游社）。
- 提交信息建议沿用仓库习惯（如 `blog: ...`、`新增 ... 开发记录`）。

## 前端模块维护（src/components、src/layouts、src/pages、src/styles）

### 技术栈与工具

- Astro 5 + Svelte 5 + Tailwind CSS + Stylus，pnpm 管理。
- 静态模块用 `.astro`；交互模块（音乐播放器、搜索、显示设置）用 `.svelte`。
- 路径别名：`@components/*`、`@layouts/*`、`@utils/*`（见 `tsconfig.json`）。
- 校验命令：`pnpm lint`（Biome 只检查）、`pnpm format`（自动格式化）、`pnpm type-check`、`pnpm build`。

### 模块结构

- **侧边栏小部件**：`src/components/widget/`（Profile、Tags、BlogExplorer、YukiServices、ProjectProgress 等），在 `src/components/widget/SideBar.astro` 中挂载。
- **页面组件**：`src/components/`（Navbar、Footer、PostCard、PostPage 等）。
- **控制组件**：`src/components/control/`（BackToTop、Pagination、ButtonTag 等）。
- **音乐模块**：`src/components/music/`（PlayerFull、MusicPlayer、music-store.svelte.ts 等）。
- **布局**：`src/layouts/`（`Layout.astro` 总布局、`MainGridLayout.astro` 主网格，侧栏 + 正文 + TOC 的排列在此）。
- **路由页面**：`src/pages/`（`[...page].astro`、`posts/[...slug].astro`、`archive/`、`devlogs/`、`rss.xml.ts` 等）。
- **样式**：`src/styles/`（main.css、markdown.css、markdown-extend.styl、variables.styl）。
- **配置**：`src/config.ts`（站点与模块开关）、`src/types/config.ts`（配置类型）、`src/constants/`（常量与第三方配置）。

### 新增小模块的流程

1. 在对应目录（widget 模块放 `src/components/widget/`）新建组件文件。
2. 小部件用 `LiquidGlassLayout` 包裹（props：`id`/`name`/`icon`/`isCollapsed`/`collapsedHeight`），内容放 `<slot />`。
3. 在 `SideBar.astro` 中挂载；若模块需要开关，在 `src/config.ts` 与 `src/types/config.ts` 中补充配置项，并在挂载处用条件渲染控制。
4. 复用现有设计语言：CSS 变量（`--hue`、`--primary`）、`card-base`、`btn-regular`、`onload-animation` 等类名；图标用 `astro-icon` 的 `Icon` 组件。
5. 运行 `pnpm lint`、`pnpm type-check`、`pnpm build` 验证。

### 删减小模块

- 删除组件文件前先全局搜索确认没有引用；同步移除相关样式与配置项。
- 删除图片资源用 `pnpm clean`（先 dry-run 确认）。
- 若模块有路由页面，确认对应导航链接一并处理。
