## Fuwari 博客重构计划

**项目**: `fuwari` (Astro 5.7 + Svelte 5 + Tailwind CSS)
**制定日期**: 2026-06-04
**目标**: 全面重构 — 提升代码可维护性、改善用户体验、用 Svelte 重写播放器系统

---

### Phase 0: 准备工作（预计 1-2h）

**目标**: 建立安全网，确保重构过程中随时可以回退。

**分支结构说明**（Fork 项目）:
- `origin/fuwari/main` — 用户的主分支（所有开发工作的基准）
- `origin/main` — 上游原作者的 main 分支（不操作）
- `refactor/full-rewrite` — 本次重构工作分支，完成后合并回 `fuwari/main`

1. **从 fuwari/main 创建重构分支** ✅ 已完成 (commit: `09f83f2` 前)
   ```bash
   git checkout fuwari/main
   git checkout -b refactor/full-rewrite
   ```

2. **确认当前构建和检查均通过** ✅ 已完成
   - `pnpm build` — 成功（50 pages, 7.8s）
   - `pnpm type-check` — 发现 2 个已有错误（`officialSites` 类型缺失、`hast` 模块缺失），将在 Phase 7 修复
   - `pnpm lint` — 修复了 30 个文件，剩余 4 个 Search.svelte 警告将在 Phase 7 处理

3. **记录当前页面快照** — 对首页、文章页、关于页、友链页、404 页各截一张图，作为重构后的视觉对比基准。

---

### Phase 1: 拆分 Layout.astro（预计 3-4h）

**目标**: 将 859 行的 Layout.astro 拆成职责单一的小模块。

**当前问题**: Layout.astro 承担了主题初始化、分析注入、Cookie 同意、域名检测、背景图加载、滚动条初始化、Fancybox 绑定、Swup 钩子、滚动事件处理等全部职责。

**拆分方案**:

| 新文件 | 职责 | 来源行数 |
|--------|------|----------|
| `src/layouts/Layout.astro` | 仅保留 HTML 骨架 + slot + 组合下面各模块 | ~80 行 |
| `src/components/head/HeadMeta.astro` | `<head>` 中的 meta、favicon、OG 标签 | 88-128 |
| `src/components/head/ThemeInit.astro` | `<head>` 中的 inline script（主题/hue/背景图初始化） | 131-213 |
| `src/components/analytics/AnalyticsScripts.astro` | Cookie 同意横幅 + 分析脚本注入 | 281-324, 416-491 |
| `src/components/DomainChecker.astro` | 域名安全检测脚本 | 342-412 |
| `src/scripts/swup-hooks.ts` | Swup 钩子注册（`link:click`、`content:replace`、`visit:start` 等） | 530-753 |
| `src/scripts/fancybox-init.ts` | Fancybox 绑定与 Swup 生命周期同步 | 805-858 |
| `src/scripts/scroll-handler.ts` | 滚动事件处理（回到顶部、TOC 显隐、navbar 显隐） | 755-801 |

**重构后的 Layout.astro 大致结构**:

```astro
---
import HeadMeta from "@components/head/HeadMeta.astro";
import ThemeInit from "@components/head/ThemeInit.astro";
import AnalyticsScripts from "@components/analytics/AnalyticsScripts.astro";
import DomainChecker from "@components/DomainChecker.astro";
import GlobalMusicPlayer from "@components/widget/GlobalMusicPlayer.astro";
import DynamicIsland from "@components/widget/DynamicIsland.astro";
// ...props 处理
---
<!DOCTYPE html>
<html ...>
  <head>
    <ThemeInit />
    <HeadMeta />
    <slot name="head" />
  </head>
  <body ...>
    <div id="bg-layer"></div>
    <ConfigCarrier />
    <slot />
    <GlobalMusicPlayer />
    <DynamicIsland />
    <AnalyticsScripts />
    <DomainChecker />
  </body>
</html>
<script>
  import "../scripts/swup-hooks.ts";
  import "../scripts/fancybox-init.ts";
  import "../scripts/scroll-handler.ts";
  // OverlayScrollbars init
</script>
```

**关键注意事项**:
- ThemeInit 中的 inline script 必须保留 `is:inline define:vars` 模式（防止 FOUC），不能改为外部文件
- AnalyticsScripts 内部的 Cookie 同意逻辑和分析注入逻辑合并为一份，消除当前的代码重复
- 拆分后运行 `pnpm build` 确认无报错，逐页面对比截图

---

### Phase 2: 分析与 Cookie 模块去重（预计 1-2h）

**目标**: 消除分析脚本的两份重复，统一为单一数据源。

**当前问题**: 五个分析服务的配置（Umami website-id、百度统计 JS 地址、Clarity ID、GA tracking ID、CF beacon token）在 Layout.astro 中出现了两次。

**方案**:

1. 创建 `src/constants/analytics.ts`，将所有分析服务配置集中声明：
   ```ts
   export const analyticsConfig = {
     umami: { websiteId: "15924681-..." },
     baidu: { scriptUrl: "https://hm.baidu.com/hm.js?69025b38..." },
     clarity: { projectId: "udl1zwuz27" },
     ga: { trackingId: "G-8BSEJ23TXZ" },
     cloudflare: { token: "58c9626f..." },
   };
   ```

2. 在 `AnalyticsScripts.astro` 中：
   - `<head>` 中只放一段"已同意则自动注入"的检查脚本
   - Cookie 同意后的 `injectAnalytics()` 调用同一个配置
   - 配置通过 `define:vars` 传入 inline script

3. 验证：清除 localStorage 中的 `cookie-consent`，刷新页面确认横幅出现；点击接受后确认所有五个分析服务正常加载。

---

### Phase 3: CSS 体系整理（预计 2-3h） ✅ 已完成 (commit: `55fe269`)

**目标**: 消除样式重复，统一 Liquid Glass 设计令牌。

**当前问题**:
- Liquid Glass 毛玻璃效果在 main.css 中 `.card-base`、`.float-panel`、`.player-lg-container` 三处分别定义
- `cover-spin` 动画在 DynamicIsland.astro 和 GlobalMusicPlayer.astro 中各写了一遍
- Layout.astro 中 CSS 变量在 `:root` 和 `body` 各声明了一遍
- Stylus 变量（variables.styl）和 CSS 变量（main.css）两套系统并行

**方案**:

1. **提取 Liquid Glass 为 CSS 工具类** — 在 main.css 中定义可复用的 glass 样式片段：
   ```css
   /* 已有的 .card-base 保持不变，作为默认卡片 */
   
   /* 新增：glass 面板基础样式，各组件通过组合使用 */
   :root.glass .glass-panel {
     position: relative;
     backdrop-filter: blur(16px) saturate(180%);
     -webkit-backdrop-filter: blur(16px) saturate(180%);
   }
   :root.glass .glass-panel-light {
     background: linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.35) 100%);
   }
   :root.dark.glass .glass-panel-light {
     background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%);
   }
   ```

2. **统一动画定义** — 创建 `src/styles/animations.css`，集中放置所有 `@keyframes` 和动画工具类：
   - `cover-spin` / `spin` 动画（当前重复了两处）
   - `slide-up`、`slide-down`、`collapse-out`、`expand-in` 等过渡动画（当前散落在 GlobalMusicPlayer 的 `<style>` 中）
   - `glow`、`pulse` 等呼吸效果动画

3. **消除 Layout.astro 中的 CSS 变量重复** — 删除 body 上多余的那份变量声明（237-244 行），仅保留 `:root` 上的定义。

4. **清理死代码** — 删除被注释掉的 CSS/脚本片段：Layout.astro 中的 `disableAnimation` 函数、字体预加载、CSP meta 标签等。

5. **验证**: 三种主题模式（暗黑/玻璃/明亮）下逐页检查视觉效果无变化。

---

### Phase 4: 主题系统修复（预计 2h） ✅ 已完成 (commit: `6922045`)

**目标**: 解决 forceDarkMode 矛盾，统一主题管理。

**当前问题**:
- `forceDarkMode: true` 在每次页面加载时强制设置 dark + localStorage，但 Navbar 里的切换按钮仍可切到亮色
- 主题状态分散在两个 localStorage key（`theme` 和 `style-mode`），逻辑分散在 ThemeInit inline script、Navbar.astro script、setting-utils.ts 三处
- Navbar.astro 中的主题切换用纯 JS 操作 DOM class，与 setting-utils.ts 的 `setTheme()` 函数互不感知

**方案**:

1. **统一主题状态管理** — 创建 `src/scripts/theme-manager.ts`：
   ```ts
   type ThemeMode = "dark" | "glass" | "light";
   
   export function getThemeMode(): ThemeMode { ... }
   export function setThemeMode(mode: ThemeMode): void {
     // 同时更新 DOM class 和 localStorage
     const root = document.documentElement;
     root.classList.toggle("dark", mode !== "light");
     root.classList.toggle("glass", mode === "glass");
     localStorage.setItem("theme-mode", mode);
   }
   export function cycleTheme(): void {
     const current = getThemeMode();
     const next: Record<ThemeMode, ThemeMode> = {
       dark: "glass", glass: "light", light: "dark"
     };
     setThemeMode(next[current]);
   }
   ```

2. **修正 forceDarkMode 行为** — 仅影响首次访问（localStorage 无记录时），之后尊重用户选择：
   ```ts
   // ThemeInit.astro inline script 中
   const stored = localStorage.getItem("theme-mode");
   if (!stored && forceDarkMode) {
     setThemeMode("dark");  // 仅首次
   } else if (stored) {
     setThemeMode(stored);  // 尊重用户选择
   }
   ```

3. **Navbar 主题切换按钮改用 `theme-manager.ts`** — 删除 Navbar.astro 中的内联主题切换 JS，改为调用 `cycleTheme()`。

4. **更新 setting-utils.ts** — 让现有的 `setTheme` / `getStoredTheme` 与新的 theme-manager 保持一致，或直接让 theme-manager 替代它们的主题部分（保留 hue 相关函数）。

---

### Phase 5: Svelte 重写播放器系统（预计 6-8h） ✅ 已完成 (commit: `10f8b7d`)

**目标**: 用 Svelte 5 重写 GlobalMusicPlayer + DynamicIsland，替代当前的 1379 + 404 行内联脚本。

**当前问题**:
- GlobalMusicPlayer.astro 内嵌完整 TypeScript class（1379 行），大量 DOM 操作
- DynamicIsland.astro 通过 `setInterval` 轮询同步状态
- 两者通过 CustomEvent 松散耦合，没有类型安全
- 播放列表用 innerHTML 拼接 HTML
- 大量 SVG 图标硬编码在模板中
- 动画定义散落在组件 `<style>` 中

**Svelte 组件拆分方案**:

```
src/components/music/
├── music-store.svelte.ts        # Svelte 5 runes 状态管理（单例 store）
├── MusicPlayer.svelte           # 顶层容器，组合子组件
├── DynamicIsland.svelte         # 灵动岛组件
├── PlayerFull.svelte            # 展开态播放器 UI
├── PlayerControls.svelte        # 播放/暂停/上下首/进度条/音量
├── PlayerPlaylist.svelte        # 播放列表（用 Svelte each 渲染）
├── PlayerQualitySelect.svelte   # 音质选择下拉框
├── NowPlayingInfo.svelte        # 封面+标题+歌手信息
└── LyricsDisplay.svelte         # 歌词显示
```

**核心设计**:

1. **状态管理** — `music-store.svelte.ts` 使用 Svelte 5 的 `$state` runes：
   ```ts
   // music-store.svelte.ts
   interface MusicState {
     playlist: Song[];
     currentIndex: number;
     isPlaying: boolean;
     volume: number;
     quality: QualityLevel;
     currentTime: number;
     duration: number;
     lyrics: LyricLine[];
     currentLyricIndex: number;
   }
   
   class MusicStore {
     state = $state<MusicState>({ ... });
     audio = new Audio();
     
     get currentSong() { return this.state.playlist[this.state.currentIndex]; }
     play() { ... }
     pause() { ... }
     next() { ... }
     prev() { ... }
     seek(time: number) { ... }
     addSong(song: Song, autoPlay?: boolean) { ... }
     removeSong(index: number) { ... }
     async loadSongUrl(song: Song) { ... }  // API 调用
   }
   
   export const musicStore = new MusicStore();
   ```

2. **DynamicIsland 与 Player 共享同一个 store** — 不再需要 CustomEvent 或 setInterval 轮询。DynamicIsland 直接读取 `musicStore.state.isPlaying`、`musicStore.currentSong` 等响应式数据。

3. **播放列表用 Svelte `{#each}` 渲染** — 替代 innerHTML 拼接，获得完整的类型安全和响应式更新。

4. **SVG 图标** — 统一使用 `@iconify/svelte` 的 `Icon` 组件，替代硬编码的 SVG path。

5. **生命周期管理** — 用 Svelte 的 `$effect` 处理 audio 事件监听、localStorage 同步、歌词轮询，组件销毁时自动清理。

6. **动画** — 使用 Phase 3 中创建的 `animations.css` 中统一定义的动画类，不在组件内重复定义。

**对外接口** — 保留现有的 CustomEvent API（`music:add`、`music:play`）供 MusicSearch widget 调用，但在内部转为 store 方法调用。

**Astro 集成** — 在 Layout.astro 中只保留：
```astro
<MusicPlayer client:load />
```
`MusicPlayer.svelte` 内部自行渲染 DynamicIsland + PlayerFull，不再需要 Astro 侧的 `<GlobalMusicPlayer />` 和 `<DynamicIsland />` 两个独立组件。

---

### Phase 6: Navbar 和客户端脚本模块化（预计 2h） ✅ 已完成 (commit: `1129655`)

**目标**: 清理 Navbar.astro 中的内联 JS，统一脚本组织方式。

**当前问题**:
- Navbar.astro 中 56 行内联 JS 处理面板切换和主题切换
- Layout.astro 中的 `setClickOutsideToClose` 用命令式 DOM 操作
- 域名检测、Cookie 同意等各自为政

**方案**:

1. **Navbar 面板管理** — 创建 `src/scripts/panel-manager.ts`：
   ```ts
   // 统一的浮出面板管理（点击外部关闭、toggle 等）
   export function setupClickOutsideToClose(panelId: string, triggerIds: string[]) { ... }
   ```
   替代 Layout.astro 中的 `setClickOutsideToClose` 函数。

2. **Navbar.astro 瘦身** — 删除内联 `<script>` 中的 `loadButtonScript()` 函数，面板 toggle 通过 panel-manager 处理，主题切换通过 theme-manager 处理。

3. **域名检测** — 将 DomainChecker.astro 的内联脚本移到 `src/scripts/domain-checker.ts`，组件中只保留 `<script>` 的 import。

---

### Phase 7: 配置与死代码清理（预计 1-2h） ✅ 已完成 (commit: `1129655`)

**目标**: 清理遗留的死代码和可疑配置。

**具体项目**:

1. **astro.config.mjs**
   - 删除 icon 配置中的可疑 key `"preprocess: vitePreprocess(),"`
   - 统一缩进（当前混用 tab 和空格，缩进层级不一致）

2. **GlobalMusicPlayer.astro 中的废弃代码**
   - 删除 `player-collapsed` 整块（标注"已由灵动岛取代"）
   - 删除 `collapse()`、`expandFromSide()`、`updateCollapsedIndicator()` 等方法
   - 这些在 Phase 5 Svelte 重写时会自然消失

3. **Layout.astro 注释代码**
   - 删除 `disableAnimation` 函数块
   - 删除注释的字体预加载代码
   - 删除注释的 CSP meta 标签
   - 删除注释的 Swup `animation:out:start` 钩子

4. **DynamicIsland.astro**
   - 删除空的 `astro:page-load` 事件监听器（396-403 行）

5. **文件命名规范** — 统一 blog post 文件命名：
   - 全部使用 `YYYY-MM-DD-slug.md` 格式
   - 对 `admin.md`、`setu_api.md` 等无日期前缀的文件补充日期
   - 更新 `scripts/new-post.js` 模板确保新文章自动使用规范格式

---

### Phase 8: 收尾与验证（预计 2-3h） ✅ 已完成

**目标**: 确保重构结果正确、性能无退化。

1. **类型检查与 lint** ✅
   ```bash
   pnpm type-check && pnpm lint
   ```
   - type-check: 0 errors（`--isolatedDeclarations` 严格模式）
   - lint: 87 files checked, 0 issues

2. **构建验证** ✅
   ```bash
   pnpm build
   ```
   - 50 pages built in ~8s
   - 总产物 ~62MB（含图片等资源）
   - 主要 JS chunks: Layout 135K, Swup 24K, MusicPlayer 24K, Icon 24K

3. **死代码审计** ✅
   - 清理了 SideBar.astro 中的死导入（DomainSwitcher, Tags）
   - 移除了未使用的 `DEFAULT_THEME` 导出
   - 修复了 posts/[...slug].astro 中的空 `{}` class:list
   - animations.css 仅保留 `cover-spin`（唯一仍使用的动画）

4. **功能回归测试清单**（需手动验证）:
   - [ ] 首页分页导航正常
   - [ ] 文章页渲染正常（Markdown、代码块、KaTeX、admonition）
   - [ ] Giscus 评论加载正常
   - [ ] 音乐播放器：搜索、播放、暂停、上下首、进度拖拽、音量、音质切换、播放列表增删
   - [ ] 灵动岛：时钟显示、播放状态切换、点击展开播放器、歌词同步
   - [ ] 主题三态切换正常，刷新后状态保持
   - [ ] Cookie 同意横幅：接受后分析脚本加载，拒绝后不加载
   - [ ] 非官方域名访问时弹出安全警告
   - [ ] 图片灯箱（Fancybox）正常
   - [ ] 搜索功能正常
   - [ ] RSS 输出正常
   - [ ] 移动端响应式布局正常

5. **性能对比** — 用 Lighthouse 对比重构前后的 Performance / Accessibility / Best Practices / SEO 分数。（待手动执行）

6. **合并**: 所有改动已直接提交到 `fuwari/main` 分支。

---

### 时间估算总览

| Phase | 内容 | 预估时间 | 风险等级 |
|-------|------|----------|----------|
| Phase 0 | 准备工作 | 1-2h | 低 |
| Phase 1 | 拆分 Layout.astro | 3-4h | 中（inline script 拆分需小心） |
| Phase 2 | 分析脚本去重 | 1-2h | 低 |
| Phase 3 | CSS 体系整理 | 2-3h | 低 |
| Phase 4 | 主题系统修复 | 2h | 中（需处理 localStorage 迁移） |
| Phase 5 | Svelte 重写播放器 | 6-8h | 高（最大改动，需充分测试） |
| Phase 6 | 脚本模块化 | 2h | 低 |
| Phase 7 | 死代码清理 | 1-2h | 低 |
| Phase 8 | 验证与收尾 | 2-3h | 低 |
| **合计** | | **20-27h** | |

### 建议执行顺序

Phase 1-4 和 6-7 属于"低风险、高回报"的重构，建议先做。Phase 5（Svelte 重写播放器）是最大的改动，建议在其他模块稳定后再开始，单独作为一个 PR。每个 Phase 完成后单独提交一次 commit，方便出问题时精确定位。
