---
title: 从零构建短链服务：Cloudflare Worker + D1 实践
published: 2026-01-21T14:00:00+08:00
description: 从零构建基于 Cloudflare Workers、D1 和 Pages 的短链服务，讲解路由、数据库、访问统计、前端界面、自动部署与常见问题。
image: ../assets/images/2026-01-21-15-04-40-image.png
tags:
  - Cloudflare
  - Serverless
  - Vue3
category: 技术分享
draft: false
lang: zh-CN
---

## 起因

一直想拥有自己的短链服务，像 bit.ly 那样简洁的链接看起来既专业又美观。正好最近在探索 Cloudflare 的 Serverless 生态，发现 Worker + D1 的组合简直是天作之合——边缘计算 + SQLite 数据库，零服务器成本就能搞定！

于是花了几天时间，从零撸了一个完整的短链服务，支持公开创建、管理后台、访问统计等功能。

**在线体验：**
- 短链服务：[ki1.mom](https://ki1.mom)
- 管理后台：[dl.yukiryou.icu](https://dl.yukiryou.icu)

---

## 功能一览

- **公开创建** - 无需注册，输入长链接即可生成短链
- **管理后台** - 管理员可查看、编辑、删除所有链接
- **访问统计** - 记录访问 IP、来源、地区等信息
- **过期设置** - 支持为短链设置有效期
- **自动部署** - GitHub Actions + EdgeOne Pages 全自动 CI/CD

---

## 技术架构

整体架构非常简洁：

```
用户访问 ki1.mom/abc
        ↓
  Cloudflare Worker
        ↓
    Cloudflare D1
        ↓
  301 重定向到目标
```

### 技术选型

| 技术 | 选型理由 |
|------|----------|
| **Cloudflare Worker** | 全球边缘节点、冷启动 <5ms、免费额度慷慨 |
| **Cloudflare D1** | 原生集成、SQLite 语法、无需额外配置 |
| **Vue 3 + Vite** | 开发体验好、构建速度快 |
| **EdgeOne Pages** | 国内访问快、自动 CI/CD |

---

## 数据库设计

D1 使用 SQLite 语法，设计了两张表：

```sql
-- 短链表
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,        -- 短码
    original_url TEXT NOT NULL,       -- 原始 URL
    title TEXT,                        -- 链接标题
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,              -- 过期时间
    is_active INTEGER DEFAULT 1       -- 是否启用
);

-- 访问记录表
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    country TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(id)
);
```

加了几个索引优化查询性能：

```sql
CREATE INDEX idx_links_code ON links(code);
CREATE INDEX idx_visits_link_id ON visits(link_id);
```

---

## 核心实现

### 路由设计

Worker 的路由分为三层：API 接口、短链跳转、根路径重定向。

```typescript
export async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API 路由
    if (path.startsWith('/api/')) {
        return handleApi(request, env, path);
    }

    // 根路径 → 管理后台
    if (path === '/') {
        return Response.redirect('https://dl.yukiryou.icu', 302);
    }

    // 短链跳转
    const code = path.slice(1);
    if (code && !code.includes('/')) {
        return handleRedirect(code, request, env);
    }

    return new Response('Not Found', { status: 404 });
}
```

### 短链跳转

跳转逻辑很简单：查数据库 → 检查过期 → 记录访问 → 301 重定向。

```typescript
export async function handleRedirect(code: string, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const link = await env.DB.prepare(
        'SELECT * FROM links WHERE code = ? AND is_active = 1'
    ).bind(code).first<Link>();

    if (!link) {
        return new Response('Link not found', { status: 404 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response('Link expired', { status: 410 });
    }

    // 异步记录访问，不阻塞响应
    ctx.waitUntil(recordVisit(link.id, request, env));

    return Response.redirect(link.original_url, 301);
}
```

关键点是用 `ctx.waitUntil()` 异步记录访问，不影响跳转速度。

### 访问统计

利用 Cloudflare 自带的请求头获取地理信息：

```typescript
async function recordVisit(linkId: number, request: Request, env: Env): Promise<void> {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const country = request.headers.get('CF-IPCountry') || '';
    const userAgent = request.headers.get('User-Agent') || '';
    const referer = request.headers.get('Referer') || '';

    await env.DB.prepare(`
        INSERT INTO visits (link_id, ip_address, user_agent, referer, country)
        VALUES (?, ?, ?, ?, ?)
    `).bind(linkId, ip, userAgent, referer, country).run();
}
```

---

## 前端界面

采用了粉色玻璃态（Glassmorphism）设计，配合随机图片背景：

```css
:root {
  --primary: #f472b6;
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.18);
}

.card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 1rem;
}

body {
  background: url('https://img.yukiryou.icu/pic?img=ua') no-repeat center center fixed;
  background-size: cover;
}
```

效果挺好看的，配合我的随机图 API，每次刷新都是不同的背景图～

---

## CI/CD 配置

### Worker 自动部署

使用 GitHub Actions + Wrangler 自动部署：

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths: ['worker/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
        working-directory: ./worker
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: ./worker
```

### 前端自动部署

前端托管在 EdgeOne Pages，绑定 GitHub 仓库后会自动监听推送并部署，无需额外配置。

---

## 踩坑记录

### CORS 跨域

前端调 API 时遇到 CORS 错误，在 Worker 里加响应头解决：

```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### D1 表不存在

首次部署后发现表不存在，需要手动执行迁移：

```bash
npx wrangler d1 execute url-shortener-db --remote --file=./schema.sql
```

### 生产环境 API 地址

开发时用的代理，生产环境要用真实地址，用 Vite 环境变量区分：

```typescript
const API_URL = import.meta.env.PROD ? 'https://ki1.mom' : '';
```

---

## 性能数据

简单测了一下，性能非常满意：

| 指标 | 数值 |
|------|------|
| 冷启动时间 | < 5ms |
| 跳转响应时间 | < 50ms |
| D1 查询延迟 | < 10ms |

---

## 总结

这个项目让我对 Cloudflare 的 Serverless 生态有了更深的理解：

1. **Worker** 冷启动极快，全球边缘节点意味着用户无论在哪都能快速访问
2. **D1** 原生集成 Worker，SQLite 语法上手无门槛
3. **成本为零** - 在免费额度内实现了企业级功能

整体来说是个非常适合个人开发者的技术栈，推荐给大家！

---

**相关链接：**
- 项目地址：[GitHub](https://github.com/yoshino-xiao7/url-shortener)（Fork 仓库后按照 README.md 进行修改部署即可食用）
- 短链服务：[ki1.mom](https://ki1.mom)
- 管理后台：[dl.yukiryou.icu](https://dl.yukiryou.icu)
