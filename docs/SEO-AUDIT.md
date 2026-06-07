## 扣扣空间 (blog.yukiryou.top) SEO 评估与完整落地方案

**评估日期：** 2026-06-07
**技术栈：** Astro 5.7.9 / Svelte 5 / Tailwind CSS 3 / 静态输出
**主站 canonical 域名：** `https://blog.yukiryou.top`

---

### 结论

当前站点的 SEO 基础是健康的：静态预渲染、sitemap、robots.txt、RSS、清晰 URL、文章 frontmatter 和标签归档都已经具备。主要短板集中在四个方向：

1. **权威 URL 不明确**：缺少 canonical，且 `og:url` / `twitter:url` 直接使用当前 URL，镜像域名会分散信号。
2. **社交分享预览不完整**：`summary_large_image` 已声明，但缺少 `og:image` / `twitter:image`，分享卡片无法稳定生成大图。
3. **结构化数据覆盖不足**：文章有 `BlogPosting`，但字段不完整；非文章页面基本没有 schema。
4. **图片和内链策略不够完整**：Astro 图片优化被关闭，图片加载优先级未区分首屏和非首屏；分类、标签、devlogs 的发现路径还可以增强。

按本文 P0 + P1 完成后，可以比较完整地解决当前 SEO 问题。P2 属于长期维护和性能微调。

---

### 已确认的现状

| 项目 | 当前状态 | 依据 |
|------|----------|------|
| canonical | 缺失 | `src/components/head/HeadMeta.astro` 没有 `<link rel="canonical">` |
| OG/Twitter image | 缺失 | `HeadMeta.astro` 只有 title/description/url/card |
| JSON-LD | 文章页有，但字段不完整 | `src/pages/posts/[...slug].astro` 中 `BlogPosting` 缺 `image`、`url`、`dateModified` 等 |
| Astro image service | 被关闭 | `astro.config.mjs` 使用 `passthroughImageService()` |
| `ImageWrapper` loading | 未配置 | `src/components/misc/ImageWrapper.astro` 未暴露 `loading` / `fetchpriority` |
| Markdown 正文图片 lazy | 未覆盖 | Markdown 渲染出的 `<img>` 不经过 `ImageWrapper` |
| category | frontmatter 有，schema 无 | 多篇文章有 `category`，但 `src/content/config.ts` 未定义 |
| Tags 侧边栏 | 组件存在，未接入 | `Tags.astro` 未被 `SideBar.astro` 引入 |
| devlogs 索引页 | 缺失 | 只有 `/devlogs/{slug}/`，无 `/devlogs/`；侧边栏用 JS 注入部分链接 |
| viewport | 不完整 | `width=device-width`，缺少 `initial-scale=1` |
| external links rel | 不完整 | Markdown 外链设置了 `target="_blank"`，未设置 `rel` |

---

### P0：必须优先修复

#### 1. 统一 canonical 与社交 URL

**目标：** 所有页面都明确指向主域 `https://blog.yukiryou.top`，镜像域名不再分散权重。

**涉及文件：**

- `src/components/head/HeadMeta.astro`
- 可选：新增 `src/utils/seo-utils.ts`

**实施方案：**

- 在 `<head>` 输出：

```astro
<link rel="canonical" href={canonicalUrl} />
```

- `canonicalUrl` 必须基于 `Astro.site` / `import.meta.env.SITE`，不要基于当前访问 host。
- 只使用 pathname，不带 query/hash。
- 保持 `trailingSlash: "always"` 后的尾斜杠一致。
- 同步把 `og:url` 和 `twitter:url` 改成 `canonicalUrl`。
- 如果 `officialSites` 中的镜像域名继续公开访问，镜像站也应输出指向主站的 canonical。若希望搜索引擎完全不索引镜像，则在部署层增加 301 或 `noindex`，但这取决于镜像站是否还要给用户访问。

**验收标准：**

- 首页、文章页、归档页、标签页、about、friends、devlogs 页面都只有一个 canonical。
- 在镜像域名访问时，canonical 仍然指向 `https://blog.yukiryou.top/...`。
- `og:url` / `twitter:url` 与 canonical 一致。

---

#### 2. 补全 `og:image` / `twitter:image`

**目标：** 文章和普通页面分享时都有稳定可抓取的大图预览。

**涉及文件：**

- `src/config.ts`
- `src/types/config.ts`
- `src/layouts/Layout.astro`
- `src/layouts/MainGridLayout.astro`
- `src/components/head/HeadMeta.astro`
- `src/pages/posts/[...slug].astro`
- 可选：新增 `src/utils/seo-utils.ts`

**实施方案：**

- 在 `siteConfig` 中增加默认分享图，例如：

```ts
seo: {
  defaultOgImage: "/og/default.png",
}
```

- `HeadMeta.astro` 增加 `ogImage?: string` prop，并输出：

```astro
<meta property="og:image" content={absoluteOgImageUrl} />
<meta property="og:image:alt" content={pageTitle} />
<meta name="twitter:image" content={absoluteOgImageUrl} />
<meta name="twitter:image:alt" content={pageTitle} />
```

- 对文章页，优先使用 `entry.data.image`；没有封面时使用默认分享图。
- 文章封面多为 `../assets/...` 相对路径，不能直接塞进 meta。需要统一解析成绝对 URL：
  - public 路径：`/xxx.png` -> `new URL("/xxx.png", Astro.site).href`
  - 远程 URL：保持原 URL
  - content asset：用 `import.meta.glob` + `getImage()` 生成构建后的 `_astro` 图片 URL，再转成绝对 URL
- 推荐默认分享图尺寸为 `1200x630`，并放在 `public/og/default.png` 或等价路径。
- 若文章封面比例很不适合社交卡片，优先使用默认 `1200x630` 图，避免平台裁剪过度。

**验收标准：**

- 首页和文章页 HTML 都包含 `og:image`、`twitter:image`。
- 输出值是 `https://...` 绝对 URL，不是 `../assets/...`。
- 本地 build 后对应图片文件存在。
- 用社交平台调试器或页面源码确认图片可访问。

---

#### 3. 补全文章 JSON-LD

**目标：** 文章结构化数据完整、可信，能表达发布时间、更新时间、作者、图片和页面 URL。

**涉及文件：**

- `src/pages/posts/[...slug].astro`
- 可选：新增 `src/utils/seo-utils.ts`

**实施方案：**

在 `BlogPosting` 中补充：

```ts
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": canonicalUrl,
  },
  "headline": entry.data.title,
  "description": entry.data.description || entry.data.title,
  "url": canonicalUrl,
  "image": ogImageUrl,
  "datePublished": entry.data.published.toISOString(),
  "dateModified": (entry.data.updated || entry.data.published).toISOString(),
  "inLanguage": pageLang,
  "keywords": entry.data.tags,
  "author": {
    "@type": "Person",
    "name": profileConfig.name,
    "url": new URL("/about/", Astro.site).href,
  },
  "publisher": {
    "@type": "Person",
    "name": profileConfig.name,
  }
}
```

**注意事项：**

- `dateModified` 没有 `updated` 时回退到 `published`，不要留空。
- `image` 要复用第 2 项解析好的绝对 URL。
- `keywords` 可以用数组，保留现有 tags。
- JSON-LD 输出前不要包含 `undefined` 字段。

**验收标准：**

- 每篇文章 JSON-LD 包含 `url`、`image`、`datePublished`、`dateModified`。
- 没有封面的文章也能使用默认分享图作为 `image`。
- Google Rich Results Test / Schema Markup Validator 不报关键错误。

---

#### 4. 非文章页面 schema

**目标：** 首页、关于页、站点级信息有基础结构化数据。

**涉及文件：**

- `src/layouts/Layout.astro` 或新增 `src/components/head/JsonLd.astro`
- `src/pages/about.astro`

**实施方案：**

- 首页增加 `WebSite` schema：

```ts
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": siteConfig.title,
  "url": new URL("/", Astro.site).href,
  "description": siteConfig.description
}
```

- 暂时不要添加 `SearchAction`，除非站点有稳定可索引的搜索结果 URL，例如 `/search/?q={search_term_string}`。当前搜索更偏客户端体验，直接加 `SearchAction` 容易变成无效声明。
- About 页增加 `ProfilePage` + `Person`：

```ts
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": profileConfig.name,
    "url": new URL("/about/", Astro.site).href,
    "sameAs": profileConfig.links.map(link => link.url)
  }
}
```

**验收标准：**

- 首页有且只有一个站点级 `WebSite` schema。
- About 页有 `ProfilePage` 或 `Person` schema。
- 不添加没有真实搜索页支撑的 `SearchAction`。

---

### P1：增强抓取、内链和性能

#### 5. 图片优化与加载策略

**目标：** 降低图片流量和 CLS，同时不误伤首屏 LCP。

**涉及文件：**

- `astro.config.mjs`
- `src/components/misc/ImageWrapper.astro`
- `src/plugins/rehype-image-fallback.mjs` 或新增 `rehype-image-attributes.mjs`
- `src/pages/posts/[...slug].astro`
- `src/components/PostCard.astro`
- `src/components/widget/Profile.astro`
- `src/layouts/MainGridLayout.astro`

**实施方案：**

- 移除 `passthroughImageService()`，恢复 Astro 默认图片优化：

```js
// 删除 image: { service: passthroughImageService() }
// 同时移除 passthroughImageService import
```

- 修改 `ImageWrapper.astro`，增加 props：

```ts
loading?: "lazy" | "eager";
decoding?: "async" | "sync" | "auto";
fetchpriority?: "high" | "low" | "auto";
```

- 默认策略：
  - 首屏头像、首屏第一篇文章封面、文章页封面：`loading="eager"`，必要时 `fetchpriority="high"`
  - 首页后续文章卡片封面、侧边栏非关键图片、正文图片：`loading="lazy"`、`decoding="async"`
  - banner 若关闭则无影响；若开启且位于首屏，可使用 eager
- Markdown 正文图片不经过 `ImageWrapper`，需要在 rehype 插件中给 `<img>` 增加：

```js
loading: "lazy"
decoding: "async"
```

- 对本地图片尽量使用 Astro `<Image>` 输出 width/height，减少 CLS。
- 对远程图片无法由 Astro 优化时，至少保留 lazy、decoding、明确容器尺寸。

**风险与验证：**

- 恢复默认 image service 后，动态 import 图片、RSS 图片路径和文章封面都要 build 验证。
- 如果某些动态图片路径无法优化，先只恢复 `ImageWrapper` 中可确定的本地图片优化，不要一次性改太多。

**验收标准：**

- `pnpm build` 成功。
- 构建后的本地图片出现 `_astro` 优化资源。
- 正文 Markdown 图片带 `loading="lazy"`。
- 首屏关键图没有被 lazy，避免 LCP 变差。

---

#### 6. 完善外链安全属性

**目标：** 所有新窗口外链都带安全 rel。

**涉及文件：**

- `astro.config.mjs`
- `src/components/Footer.astro`
- `src/components/Navbar.astro`
- `src/components/widget/Profile.astro`
- 其他包含 `target="_blank"` 的 Astro/Svelte 组件

**实施方案：**

- Markdown 外链配置改为：

```js
[
  rehypeExternalLinks,
  {
    target: "_blank",
    rel: ["noopener", "noreferrer"],
  },
]
```

- 全仓库搜索 `target="_blank"`，模板中的外链也补 `rel="noopener noreferrer"`。
- `rel="me"` 可与安全 rel 共存，例如 `rel="me noopener noreferrer"`。

**验收标准：**

- Markdown 渲染外链有 `target="_blank"` 和 `rel`。
- 模板里所有外部新窗口链接都有 `noopener`。

---

#### 7. 标签、分类与相关文章内链

**目标：** 提升站内发现路径，让标签页、分类页和相关文章成为有效内链入口。

**涉及文件：**

- `src/components/widget/SideBar.astro`
- `src/components/widget/Tags.astro`
- `src/content/config.ts`
- `src/utils/content-utils.ts`
- 新增 `src/pages/archive/category/[category].astro`
- 可选：`src/components/RelatedPosts.astro`

**实施方案：**

- 将 `Tags.astro` 接入 `SideBar.astro`，建议放在 `BlogExplorer` 后。
- `category` 有两种选择：
  - **推荐：启用分类。** 在 content schema 加 `category: z.string().optional().default("")`，新增 `/archive/category/[category]/`，归档页支持按分类过滤。
  - **备选：移除分类。** 如果不想维护分类体系，则从 frontmatter 和新文章模板中去掉 `category`，避免死元数据。
- 若启用分类，文章元数据区可以显示分类链接，但不要让 UI 过度拥挤。
- 文章末尾增加“相关文章”，按相同 tag/category 取 3-5 篇，排除当前文章。

**验收标准：**

- 标签云在初始 HTML 中可见，不依赖 JS。
- 每个 tag/category 页面可被 sitemap 收录。
- 文章页至少有上一篇/下一篇或相关文章内链。

---

#### 8. 新增 `/devlogs/` 索引页

**目标：** devlogs 不再只依赖侧边栏 JS 注入链接，搜索引擎和用户都有稳定列表入口。

**涉及文件：**

- 新增 `src/pages/devlogs/index.astro`
- `src/components/widget/ProjectProgress.astro`
- 可选：`src/components/Navbar.astro` 或 `navBarConfig`

**实施方案：**

- 新建 `/devlogs/` 页面，服务端渲染所有 devlogs。
- 按 `project` 分组，再按 `published` 倒序排列。
- 每条包含标题、发布日期、项目名、summary、链接。
- `ProjectProgress` 中保留交互展示，但增加一个静态“全部日志”链接到 `/devlogs/`。
- 可选：导航栏或归档页增加 devlogs 入口。

**说明：**

当前侧边栏 `ProjectProgress` 会用 JS 写入 `/devlogs/{slug}/` 链接，所以“完全无法发现”不准确；更准确的问题是“缺少服务端渲染的列表页，发现路径依赖 JS 和侧边栏位置”。

**验收标准：**

- `/devlogs/` build 后存在。
- 初始 HTML 里包含所有 devlog 链接。
- sitemap 收录 `/devlogs/` 和单篇 devlog。

---

#### 9. 基础 meta 修正

**目标：** 清理容易被忽略的小问题。

**涉及文件：**

- `src/components/head/HeadMeta.astro`
- `src/config.ts`

**实施方案：**

- viewport 改为：

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

- keywords meta 改成仅非空时输出：

```astro
{siteConfig.keywords?.length > 0 && (
  <meta name="keywords" content={siteConfig.keywords.join(", ")} />
)}
```

- 如果不准备维护 keywords，直接不输出也可以。它对主流搜索引擎收益很低，不应作为主要 SEO 手段。

**验收标准：**

- 空 `keywords: []` 不再输出空 keywords meta。
- viewport 包含 `initial-scale=1`。

---

### P2：长期优化

#### 10. 文章更新时间维护

**目标：** 让 `dateModified` 真实反映内容更新，而不是永远等于发布时间。

**实施方案：**

- 新文章脚本保留 `published`。
- 内容有实质更新时人工维护 `updated`。
- 可选：写脚本检查“修改过正文但没有 updated”的文章。

**验收标准：**

- 近期更新文章有 `updated`。
- JSON-LD 和页面 PostMeta 同步显示更新日期。

---

#### 11. 字体加载微调

**目标：** 降低 FCP/LCP 的字体成本。

**实施方案：**

- 当前 Roboto 通过 `@fontsource/roboto/400.css`、`500.css`、`700.css` 三份引入。
- 可选方案：
  - 改用 variable font 包，减少多权重资源。
  - 对关键字体做 preload。
  - 保持 `font-display: swap`。
- 这项收益通常低于图片优化，不建议放在 P0/P1 前面。

**验收标准：**

- Lighthouse/WebPageTest 中字体阻塞时间下降。
- 没有明显 FOIT。

---

#### 12. robots 与 sitemap 复核

**目标：** 保证新增页面和 canonical 策略一致。

**实施方案：**

- 新增 category/devlogs 页面后，确认 sitemap 生成。
- `robots.txt` 中 sitemap 指向主域。
- 若镜像站不希望被索引，部署层处理 301 或 `noindex`，不要只依赖 canonical。

**验收标准：**

- `dist/sitemap-index.xml` 包含新增页面。
- `dist/robots.txt` 指向主站 sitemap。

---

### 推荐实施顺序

| 顺序 | 任务 | 收益 | 风险 | 预计时间 |
|------|------|------|------|----------|
| 1 | canonical + og:url/twitter:url | 高 | 低 | 10-20 分钟 |
| 2 | 默认分享图 + og:image/twitter:image | 高 | 中 | 30-60 分钟 |
| 3 | 补全文章 JSON-LD | 高 | 中 | 30-45 分钟 |
| 4 | 首页/About schema | 中 | 低 | 20-40 分钟 |
| 5 | viewport/keywords/external rel | 中 | 低 | 15-30 分钟 |
| 6 | ImageWrapper 加加载策略 | 中高 | 中 | 45-90 分钟 |
| 7 | Markdown 图片 lazy 属性 | 中 | 低 | 15-30 分钟 |
| 8 | 恢复 Astro 图片优化 | 中高 | 中高 | 1-2 小时 |
| 9 | Tags 接入侧边栏 | 中 | 低 | 10-20 分钟 |
| 10 | category schema + 分类页 | 中 | 中 | 1-2 小时 |
| 11 | `/devlogs/` 索引页 | 中 | 中 | 1-2 小时 |
| 12 | 相关文章 | 中 | 中 | 1-2 小时 |
| 13 | 字体优化/updated 维护脚本 | 低 | 低 | 后续迭代 |

---

### 验收清单

#### 构建验收

- `pnpm build` 成功。
- `dist/robots.txt` 存在并指向 `https://blog.yukiryou.top/sitemap-index.xml`。
- `dist/sitemap-index.xml` 包含新增页面。
- 无图片动态 import 报错。

#### HTML 验收

每类页面抽样检查：

- `/`
- `/posts/{slug}/`
- `/archive/`
- `/archive/tag/{tag}/`
- `/archive/category/{category}/`（若启用）
- `/about/`
- `/friends/`
- `/devlogs/`
- `/devlogs/{slug}/`

检查项：

- 有且只有一个 canonical。
- `og:url` / `twitter:url` 与 canonical 一致。
- `og:image` / `twitter:image` 是绝对 URL。
- viewport 包含 `initial-scale=1`。
- 文章页 JSON-LD 有 `url`、`image`、`datePublished`、`dateModified`。
- Markdown 正文图片有 `loading="lazy"`。
- 首屏关键图没有被误设为 lazy。

#### 外部工具验收

- Google Rich Results Test：文章页无关键错误。
- Schema Markup Validator：JSON-LD 字段有效。
- 社交分享调试器：可抓取标题、描述、图片。
- Lighthouse：确认图片优化没有拉低 LCP。

---

### 站点架构建议

建议最终形成以下结构：

```text
blog.yukiryou.top/
├── /                          首页
├── /{n}/                      首页分页
├── /posts/{slug}/             文章
├── /archive/                  总归档
├── /archive/tag/{tag}/        标签归档
├── /archive/category/{cat}/   分类归档
├── /about/                    关于
├── /friends/                  友链
├── /devlogs/                  开发日志列表
├── /devlogs/{slug}/           开发日志详情
├── /rss.xml                   RSS
├── /sitemap-index.xml         Sitemap
└── /404                       404
```

内链增强路径：

- 侧边栏展示标签云。
- 文章页展示标签、分类、上一篇/下一篇、相关文章。
- 归档页提供 tag/category/devlogs 的入口。
- ProjectProgress 保留交互展示，但提供静态 `/devlogs/` 入口。

---

### 方案完整性判断

原始方案已经覆盖了 SEO 的核心问题，但不够完整的地方主要是“实现细节”和“覆盖范围”：

- `og:image` 需要解决 content asset 到绝对 URL 的转换。
- 图片 lazy 需要同时覆盖 `ImageWrapper` 和 Markdown 正文图片，并区分首屏图片。
- `SearchAction` 需要真实搜索结果页支撑，不能直接加。
- devlogs 的问题不是完全不可发现，而是缺少服务端列表页。
- external link rel 不能只处理 Markdown，也要扫 Astro/Svelte 模板。
- keywords 不是“永远不会输出”，而是空数组可能输出空 meta，应改成非空才输出。

补上这些约束后，这份方案可以作为后续实现 SEO 修复的完整执行依据。
