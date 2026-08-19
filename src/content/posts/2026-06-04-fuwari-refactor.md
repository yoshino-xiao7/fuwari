---
title: 用 Svelte 5 重写了博客的音乐播放器系统：一次 8 阶段的全面重构
published: 2026-06-04T17:49:33+08:00
description: 记录对 Fuwari 博客主题的 8 阶段全面重构，重点是用 Svelte 5 runes 替代 1400 行 DOM 操作的播放器系统，以及过程中发现的 CSS 外部化时序 bug 和灵动岛状态同步问题。
tags:
  - 前端
  - Svelte
  - Astro
category: 开发
draft: false
lang: zh-CN
---

## # 起因：1400 行的单文件组件

这个博客用的是 Fuwari 主题，一套基于 Astro 的日系博客框架。功能够用，但代码积累久了，有些地方开始变得难以维护。

最让我头疼的是音乐播放器。`GlobalMusicPlayer.astro` 一个文件塞了 1033 行——一个完整的 TypeScript class，用纯 DOM 操作管理播放、暂停、进度条、播放列表、音质切换。灵动岛 `DynamicIsland.astro` 又是 383 行，靠 `setInterval` 每 3 秒轮询同步播放状态。两个组件之间只通过 `CustomEvent` 松散耦合，没有类型安全可言。

播放列表用 `innerHTML` 拼接 HTML 字符串，SVG 图标全部硬编码在模板里，动画定义散落在两个组件的 `<style>` 块中互相重复。每次想改个小功能，都得在一大堆 DOM 查询和事件绑定里小心翼翼。

于是我决定：既然项目已经装了 Svelte 5，不如彻底重写。

---

## # 不只是播放器：8 阶段重构计划

在动手之前，我先梳理了整个博客的代码结构，发现需要重构的不止播放器。Layout.astro 承担了太多职责（859 行，包含主题初始化、分析注入、Cookie 同意、Swup 钩子、滚动处理），分析脚本配置写了两份，CSS 变量在 `:root` 和 `body` 上各声明了一遍，主题状态分散在三个文件里。

最终我制定了一个 8 阶段的计划：

1. **拆分 Layout.astro** — 从 859 行瘦身到 80 行骨架
2. **分析脚本去重** — 五个分析服务配置集中到 `analytics.ts`
3. **CSS 体系整理** — 统一 Liquid Glass 设计令牌，集中动画定义
4. **主题系统修复** — 三态切换（暗黑/玻璃/明亮）统一为 `theme-manager.ts`
5. **Svelte 重写播放器** — 本文重点
6. **脚本模块化** — 内联 JS 迁移到 ES 模块
7. **配置与死代码清理** — 类型修复、废弃代码移除
8. **收尾验证** — type-check、lint、构建、死代码审计

Phase 1-4 和 6-7 属于"低风险高回报"的清理工作，先做掉能降低后续的风险。Phase 5（Svelte 重写）是最大改动，放在中间单独做。

---

## # 核心设计：Svelte 5 Runes 单例 Store

重写播放器的核心思路是**用一个共享的响应式 store 替代所有 DOM 操作和事件轮询**。

Svelte 5 引入了 runes 语法——`$state`、`$derived`、`$effect`——可以在 `.svelte.ts` 文件里定义响应式状态。我把整个播放器的状态管理浓缩到了一个单例 class 里：

```typescript
class MusicStore {
  playlist: Song[] = $state([]);
  currentIndex: number = $state(-1);
  isPlaying: boolean = $state(false);
  volume: number = $state(0.8);
  quality: QualityLevel = $state("exhigh");
  currentTime: number = $state(0);
  duration: number = $state(0);
  // ...

  get currentSong(): Song | null {
    return this.playlist[this.currentIndex] ?? null;
  }

  get progressPercent(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }

  async playCurrent() { /* 获取 URL → 播放 */ }
  togglePlay() { /* 播放/暂停 */ }
  next() { /* 下一首 */ }
  addSong(song: Song, autoPlay = true) { /* 添加歌曲 */ }
}

export const musicStore = new MusicStore();
```

灵动岛和播放器面板都读取同一个 store。不再需要 `CustomEvent` 传递状态，不再需要 `setInterval` 轮询。`musicStore.isPlaying` 变了，所有订阅它的组件自动更新。

组件拆成了 8 个文件：

```
src/components/music/
├── music-store.svelte.ts    # 状态管理（上面的 store）
├── types.ts                 # Song, LyricLine, QualityLevel
├── MusicPlayer.svelte       # 顶层容器（Astro client:load 挂载）
├── DynamicIsland.svelte     # 灵动岛 + 展开面板
├── PlayerFull.svelte        # 展开态 UI 容器
├── NowPlayingInfo.svelte    # 封面 + 标题 + 歌手
├── PlayerControls.svelte    # 播放控制 + 进度条 + 音量
├── PlayerPlaylist.svelte    # 播放列表（Svelte {#each}）
└── PlayerQualitySelect.svelte
```

播放列表从 `innerHTML` 拼接变成了 Svelte 的 `{#each}` 块，获得了完整的类型安全和响应式更新。灵动岛的展开动画用了 Svelte 内置的 `scale` transition，比原来手动操作 `requestAnimationFrame` 简洁得多。

---

## # 意外收获：CSS 外部化引发的时序 Bug

重构过程中发现了一个很有意思的 bug。

原来的 `ThemeInit.astro` 里有一段 `<script is:inline>`，用来在页面加载时检测背景图是否加载成功，然后给 `#bg-layer` 添加 `bg-loaded` 类名让背景淡入。这段脚本通过 `getComputedStyle` 读取 `--bg-url` CSS 变量来获取背景图地址。

Phase 1 拆分 Layout 后，背景图在 Safari 上不显示了。

根因是 Astro 的 CSS 外部化行为：当 `<style define:vars>` 从 Layout.astro 移到子组件 ThemeInit.astro 后，Astro 把 CSS 输出到了外部文件。`<script is:inline>` 在 `<head>` 中同步执行时，外部 CSS 还没加载完，`getComputedStyle` 返回的是空值。

这个 bug 其实影响所有浏览器，只是 Safari 的 CSS 加载时序让它更容易暴露。

修复方案是三管齐下：把背景图 CSS 变量注入到 `<html>` 元素的 inline style 上（确保立即可用），通过 `define:vars` 把 `bgSrc` 和 `bgEnable` 直接传给 inline script（不再依赖 `getComputedStyle`），以及给 ThemeInit 的 `<style>` 加 `is:global` 避免作用域属性不匹配。

---

## # 灵动岛的状态同步问题

Svelte 重写上线后，灵动岛出了两个显示 bug。

第一个是**没播放音乐也显示播放状态**。原因是灵动岛的播放视图用 `class:hidden` 切换可见性，条件只检查了 `hasSong`（播放列表有歌就为 true），没同时检查 `isPlaying`。页面加载后如果之前有播放记录，播放列表不为空，播放视图就会错误地显示出来。

修复方案是引入 `isActive = isPlaying && hasSong` 派生变量，并把 `class:hidden` 替换成 Svelte 的 `{#if}/{:else}` 块——保证 idle 和 playing 两个视图互斥渲染，不依赖 CSS 类名切换。

第二个问题其实不算 bug——原来的代码里 `music:add` 事件（点击"+"号添加歌曲）和 `music:play` 事件（点击歌曲行播放）都传了 `autoPlay=true`，意味着添加歌曲时也会自动播放。这是原有行为，我选择保持了一致。

---

## # 结果

重构前后的对比：

- **Layout.astro**: 859 行 → ~80 行骨架 + 6 个职责单一的子组件
- **播放器系统**: 1416 行内联脚本 → 8 个 Svelte 组件 + 1 个 store，总计约 1000 行（含样式）
- **主题管理**: 3 个文件各管一段 → `theme-manager.ts` 统一处理
- **分析脚本**: 配置写了两份 → 集中到 `analytics.ts` 一处
- **死代码**: 清理了废弃导入、未使用导出、注释代码块、无效 CSS 选择器

构建验证：`pnpm type-check` 零错误（`--isolatedDeclarations` 严格模式），`pnpm lint` 87 个文件零问题，`pnpm build` 50 页 8 秒完成。

如果你也在维护一个逐渐膨胀的 Astro 项目，我的建议是：先做低风险的结构清理（拆分大文件、去重配置），再动核心组件的重写。这样核心重写时面对的是一个干净、可预测的代码基，出问题时也容易定位。
