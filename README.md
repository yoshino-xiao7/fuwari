# Fuwari

`fuwari` 是当前个人博客站点源码，基于上游 Fuwari 主题定制，运行在 Astro 5 + Svelte 5 + Tailwind CSS 上。仓库重点维护博客内容、站点 UI、音乐播放器、评论、RSS、SEO 和多平台部署配置。

## 技术栈

- Astro 5.7
- Svelte 5
- Tailwind CSS + Stylus
- Biome
- pnpm 9.14

## 环境要求

- Node.js 22 或更新版本
- pnpm 9.14.4

## 常用命令

```bash
pnpm install
pnpm dev
pnpm type-check
pnpm lint
pnpm build
pnpm preview
```

`pnpm lint` 只检查代码；需要自动格式化时使用：

```bash
pnpm format
```

## 内容维护

新建文章：

```bash
pnpm new-post hello-world
```

文章放在 `src/content/posts`，项目日志放在 `src/content/devlogs`。文章 frontmatter 示例：

```markdown
---
title: 文章标题
published: 2026-06-05T12:00:00
updated: 2026-06-05T12:30:00
description: 文章描述
image: ./cover.jpg
tags: [Astro, Svelte]
pinned: false
draft: false
lang: zh_CN
---
```

## 资源清理

`pnpm clean` 会扫描 `src/content/assets` 中未被 `src/content/posts` 引用的图片。该命令默认是 dry-run，只打印待删除列表：

```bash
pnpm clean
```

确认后再执行删除：

```bash
pnpm clean -- --write
```

## 站点配置

主要配置入口：

- `src/config.ts`：站点标题、导航、主题、背景、头像、官方域名、许可证等。
- `src/constants/analytics.ts`：Umami、百度统计、Clarity、Google Analytics、Cloudflare Web Analytics 配置。
- `src/constants/comments.ts`：Giscus 评论配置。

音乐搜索和播放器使用自建后端：

- 生产环境：`https://api.yukiryou.icu/blog/music`
- 本地开发：`http://localhost:9898/blog/music`

这些地址是业务依赖，修改前需要确认后端部署和前台播放器一起兼容。

## 隐私与第三方脚本

站点包含 Cookie 同意横幅。Umami、百度统计、Clarity、Google Analytics 和 Cloudflare Web Analytics 会在用户接受后注入；Vercel Analytics 由 Vercel 平台脚本提供，隐私说明见 `src/content/spec/about.md`。

评论区使用 Giscus，文章页和 devlog 页共用 `src/components/comments/Giscus.astro`。

## CI/CD

GitHub Actions 使用 pnpm 安装依赖并构建：

- `.github/workflows/build.yml`：Astro check 和 build。
- `.github/workflows/biome.yml`：Biome 检查。
- `.github/workflows/deploy.yml`：构建并发布 `dist` 到 `page` 分支。

当前 workflow 监听 `main` 和 `fuwari/main`。

## 项目结构

```text
├── public/                 # 静态资源
├── src/
│   ├── components/         # Astro/Svelte 组件
│   ├── constants/          # 分析、评论、链接等常量
│   ├── content/            # posts/devlogs/spec 内容
│   ├── layouts/            # 页面布局
│   ├── pages/              # 路由页面
│   ├── scripts/            # 客户端初始化脚本
│   ├── styles/             # 全局样式
│   └── config.ts           # 站点配置
├── scripts/                # Node 工具脚本
└── docs/                   # AI 计划和审查文档，本地默认忽略
```

## 上游

基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 定制。
