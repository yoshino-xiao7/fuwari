---
title: "Setu Cloud v3 重构启动"
published: 2026-03-10T10:00:00
project: "xueliangyun"
summary: "开始规划 v3 架构重构，考虑从 Java 迁移到 Cloudflare Workers，前端引入 Liquid Glass 设计风格。"
---

## 重构计划

v2 系列已运行四个月，代码质量需要改善。v3 计划：

- **后端**：从 Java 迁移到更轻量方案（Cloudflare Workers / Hono）
- **前端**：UI 全面升级，引入 Liquid Glass 设计风格
- **图库系统**：增加标签搜索、图片分类、质量评分
- **开放 API v3**：重新设计接口规范
