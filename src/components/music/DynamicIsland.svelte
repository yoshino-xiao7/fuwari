<!--
  DynamicIsland.svelte — Apple-style 灵动岛
  Idle: 时钟 | Playing: 封面+歌词+波形 | Expanded: 完整播放器面板
-->
<script lang="ts">
import { onMount, tick } from "svelte";
import { scale } from "svelte/transition";
import PlayerFull from "./PlayerFull.svelte";
import { musicStore } from "./music-store.svelte";

type IslandMode =
	| "clock"
	| "paused"
	| "playing"
	| "loading"
	| "error"
	| "expanded";

let islandEl: HTMLElement | undefined = $state();
let clock = $state("00:00:00");
let lyricText = $state("♪ 播放中");
let now = $state(Date.now());
let clickTimer: ReturnType<typeof setTimeout> | null = null;

// Derived values
let hasSong = $derived(musicStore.currentSong !== null);
let coverUrl = $derived(
	musicStore.currentSong?.cover
		? `${musicStore.currentSong.cover}?param=60y60`
		: "",
);
let songTitle = $derived(musicStore.currentSong?.name ?? "");
let songArtist = $derived(musicStore.currentSong?.artist ?? "");
let pausedText = $derived(songTitle ? `已暂停 · ${songTitle}` : "已暂停");
let islandMode: IslandMode = $derived.by(() => {
	if (musicStore.isExpanded) return "expanded";
	if (musicStore.isLoading && hasSong) return "loading";
	if (musicStore.errorMessage) return "error";
	if (musicStore.isPlaying && hasSong) return "playing";
	if (hasSong && now < musicStore.pausedVisibleUntil) return "paused";
	return "clock";
});

// Island CSS class
let islandClass = $derived.by(() => {
	if (musicStore.isExpanded) return "dynamic-island di-idle";
	if (islandMode === "playing" || islandMode === "paused") {
		return "dynamic-island di-playing-pill with-lyric";
	}
	if (islandMode === "loading" || islandMode === "error") {
		return "dynamic-island di-status-pill";
	}
	return "dynamic-island di-idle";
});
let islandTitle = $derived.by(() => {
	if (islandMode === "playing" && songTitle) {
		return `正在播放：${songTitle}${songArtist ? ` - ${songArtist}` : ""}`;
	}
	if (islandMode === "paused" && songTitle) {
		return `已暂停：${songTitle}${songArtist ? ` - ${songArtist}` : ""}`;
	}
	if (islandMode === "loading") return "音乐加载中";
	if (islandMode === "error") return musicStore.errorMessage || "播放出错";
	return `北京时间 ${clock}`;
});

onMount(() => {
	clock = musicStore.formatClock();
	const clockId = setInterval(() => {
		now = Date.now();
		clock = musicStore.formatClock();
	}, 1000);

	const handleWindowKeydown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && musicStore.isExpanded) {
			closePlayer();
		}
	};
	window.addEventListener("keydown", handleWindowKeydown);

	return () => {
		clearInterval(clockId);
		window.removeEventListener("keydown", handleWindowKeydown);
		if (clickTimer) clearTimeout(clickTimer);
	};
});

// Update lyrics on timeupdate
$effect(() => {
	const _t = musicStore.currentTime;
	if (musicStore.isPlaying && hasSong) {
		const nextLyric = musicStore.updateLyric(_t);
		if (nextLyric !== lyricText) lyricText = nextLyric;
	}
});

function handleIslandClick(e: MouseEvent) {
	if (e.detail > 1 && clickTimer) {
		clearTimeout(clickTimer);
		clickTimer = null;
		musicStore.togglePlay();
		return;
	}

	clickTimer = setTimeout(() => {
		clickTimer = null;
		if (musicStore.isExpanded) {
			closePlayer();
		} else {
			openPlayer();
		}
	}, 180);
}

function handleIslandKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		if (musicStore.isExpanded) {
			closePlayer();
		} else {
			openPlayer();
		}
	}
	if (e.key === "Escape" && musicStore.isExpanded) {
		e.preventDefault();
		closePlayer();
	}
}

async function openPlayer() {
	musicStore.isExpanded = true;
	await tick();
	const firstControl = document.querySelector<HTMLElement>(
		".player-panel button, .player-panel input, .player-panel select",
	);
	firstControl?.focus();
}

function closePlayer() {
	musicStore.isExpanded = false;
	requestAnimationFrame(() => islandEl?.focus());
}

function handleBackdropClick() {
	closePlayer();
}

function handleQuickControl(e: MouseEvent, action: "prev" | "next") {
	e.stopPropagation();
	if (action === "prev") {
		musicStore.prev();
	} else {
		musicStore.next();
	}
}
</script>

<!-- Dynamic Island pill -->
<div
	bind:this={islandEl}
	class={islandClass}
	title={islandTitle}
	onclick={handleIslandClick}
	onkeydown={handleIslandKeydown}
	role="button"
	tabindex="0"
	aria-expanded={musicStore.isExpanded}
	aria-controls="music-player-panel"
	aria-label={islandTitle}
>
	{#if islandMode === "playing" || islandMode === "paused"}
		{#if hasSong}
			<button
				type="button"
				class="di-quick-btn di-prev"
				aria-label="上一首"
				onclick={(e) => handleQuickControl(e, "prev")}
			>
				‹
			</button>
			<button
				type="button"
				class="di-quick-btn di-next"
				aria-label="下一首"
				onclick={(e) => handleQuickControl(e, "next")}
			>
				›
			</button>
		{/if}
		<div class="di-pill-playing">
			{#if coverUrl}
				<img
					src={coverUrl}
					alt=""
					class="di-cover cover-spin"
					class:playing={musicStore.isPlaying}
				/>
			{/if}
			<div class="di-lyric">
				{islandMode === "paused" ? pausedText : lyricText}
			</div>
			{#if islandMode === "playing"}
				<div class="di-waveform active" aria-hidden="true">
					<span></span><span></span><span></span><span></span>
				</div>
			{:else}
				<div class="di-paused-dot" aria-hidden="true"></div>
			{/if}
		</div>
	{:else if islandMode === "loading" || islandMode === "error"}
		<div class="di-pill-status" class:error={islandMode === "error"}>
			<span class="di-status-dot" aria-hidden="true"></span>
			<span class="di-status-text">
				{islandMode === "loading" ? "加载中" : "播放出错"}
			</span>
		</div>
	{:else}
		<div class="di-pill-idle">
			<span class="di-clock">{clock}</span>
		</div>
	{/if}
</div>

<!-- Expanded player panel -->
{#if musicStore.isExpanded}
	<button
		type="button"
		class="di-backdrop"
		aria-label="关闭播放器"
		onclick={handleBackdropClick}
	></button>
	<div class="player-panel">
		<div
			id="music-player-panel"
			class="player-full"
			class:playing={musicStore.isPlaying}
			role="dialog"
			aria-modal="false"
			aria-label="音乐播放器"
			in:scale={{ duration: 350, start: 0, opacity: 0, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			out:scale={{ duration: 250, opacity: 0, easing: (t) => t * t }}
		>
			<!-- Liquid Glass layers -->
			<div class="player-lg-backdrop"></div>
			<div class="player-lg-border player-lg-border-screen"></div>
			<div class="player-lg-border player-lg-border-overlay"></div>
			<div class="player-lg-hover-glow"></div>

			<PlayerFull />
		</div>
	</div>
{/if}

<style>
	/* ===== Island pill ===== */
	.dynamic-island {
		position: fixed;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 45%),
			#0b0b0d;
		border-radius: 99px;
		cursor: pointer;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.12) inset,
			0 2px 16px rgba(0, 0, 0, 0.35);
		z-index: 9999;
		overflow: hidden;
		flex-shrink: 0;
		transition:
			width 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.3s ease;
	}
	.dynamic-island:focus-visible {
		outline: 2px solid oklch(0.75 0.18 var(--hue));
		outline-offset: 4px;
	}
	.dynamic-island:hover {
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.16) inset,
			0 4px 24px rgba(0, 0, 0, 0.5);
	}

	/* Idle */
	.dynamic-island.di-idle {
		width: 110px;
		height: 32px;
		padding: 0 14px;
	}

	/* Playing pill */
	.dynamic-island.di-playing-pill {
		width: 120px;
		height: 34px;
		padding: 0 12px;
	}
	.dynamic-island.di-playing-pill.with-lyric {
		width: 180px;
	}
	.dynamic-island.di-status-pill {
		width: 128px;
		height: 32px;
		padding: 0 14px;
	}

	/* Clock */
	.di-clock {
		font-family: "SF Mono", "Menlo", "Consolas", "Monaco", monospace;
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.75);
		letter-spacing: 0.08em;
		line-height: 1;
		white-space: nowrap;
	}

	/* Inner containers */
	.di-pill-idle,
	.di-pill-playing {
		display: flex;
		align-items: center;
		width: 100%;
	}
	.di-pill-idle {
		justify-content: center;
	}
	.di-pill-playing {
		justify-content: space-between;
	}
	.dynamic-island.with-lyric .di-pill-playing {
		gap: 8px;
		justify-content: flex-start;
	}

	/* Cover */
	.di-cover {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		object-fit: cover;
		background: #333;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.18),
			0 2px 8px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}

	/* Lyric */
	.di-lyric {
		flex: 1;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		-webkit-mask-image: linear-gradient(90deg, #000 82%, transparent);
		mask-image: linear-gradient(90deg, #000 82%, transparent);
		font-weight: 500;
		letter-spacing: 0.02em;
		line-height: 1;
		transition: opacity 0.15s ease;
	}

	.di-pill-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
	}
	.di-status-text {
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.78);
		line-height: 1;
		white-space: nowrap;
	}
	.di-status-dot,
	.di-paused-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: oklch(0.72 0.18 var(--hue));
		flex-shrink: 0;
	}
	.di-status-dot {
		animation: diPulse 1s ease-in-out infinite;
	}
	.di-pill-status.error .di-status-dot {
		background: oklch(0.68 0.22 25);
		animation: none;
	}
	.di-paused-dot {
		opacity: 0.72;
	}

	/* Waveform */
	.di-waveform {
		display: flex;
		align-items: center;
		gap: 2px;
		height: 16px;
		flex-shrink: 0;
	}
	.di-waveform span {
		display: block;
		width: 2px;
		background: oklch(0.7 0.18 var(--hue));
		border-radius: 1px;
		height: 4px;
		transition: height 0.2s ease;
	}
	.di-waveform.active span {
		animation: diWave 1.2s ease-in-out infinite;
	}
	.di-waveform.active span:nth-child(1) { animation-delay: 0s; }
	.di-waveform.active span:nth-child(2) { animation-delay: 0.2s; }
	.di-waveform.active span:nth-child(3) { animation-delay: 0.4s; }
	.di-waveform.active span:nth-child(4) { animation-delay: 0.6s; }

	@keyframes diWave {
		0%, 100% { height: 4px; }
		50% { height: 14px; }
	}
	@keyframes diPulse {
		0%, 100% {
			opacity: 0.45;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Quick controls */
	.di-quick-btn {
		position: absolute;
		top: 50%;
		z-index: 2;
		width: 24px;
		height: 24px;
		border: 0;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transform: translateY(-50%) scale(0.9);
		transition:
			opacity 0.18s ease,
			transform 0.18s ease,
			background 0.18s ease;
	}
	.di-quick-btn:hover,
	.di-quick-btn:focus-visible {
		background: rgba(255, 255, 255, 0.2);
	}
	.di-prev {
		left: 6px;
	}
	.di-next {
		right: 6px;
	}
	.dynamic-island.di-playing-pill:hover .di-quick-btn,
	.dynamic-island.di-playing-pill:focus-within .di-quick-btn {
		opacity: 1;
		pointer-events: auto;
		transform: translateY(-50%) scale(1);
	}

	/* Backdrop */
	.di-backdrop {
		position: fixed;
		inset: 0;
		z-index: 95;
		background: transparent;
		border: 0;
		padding: 0;
	}

	/* Player panel container */
	.player-panel {
		position: fixed;
		top: 52px;
		left: 50%;
		z-index: 200;
		width: min(320px, calc(100vw - 24px));
		transform: translateX(-50%);
		pointer-events: auto;
	}

	/* ===== Player Liquid Glass ===== */
	.player-full {
		position: relative;
		width: 100%;
		border-radius: 16px;
		overflow: hidden;
		isolation: isolate;
		transform-origin: top center;
		box-shadow: var(--glass-panel-shadow, 0 8px 32px rgba(0, 0, 0, 0.1));
		transition:
			transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
			box-shadow 0.35s ease;
	}
	.player-full:hover {
		box-shadow: var(--glass-shadow-hover, 0 12px 48px rgba(0, 0, 0, 0.15));
	}
	:global(.dark) .player-full {
		box-shadow: var(--glass-panel-shadow, 0 8px 32px rgba(0, 0, 0, 0.3));
	}
	:global(.dark) .player-full:hover {
		box-shadow: var(--glass-shadow-hover, 0 12px 48px rgba(0, 0, 0, 0.4));
	}

	/* Glass backdrop layer */
	.player-lg-backdrop {
		position: absolute;
		inset: 0;
		-webkit-backdrop-filter: var(--glass-panel-filter, blur(20px) saturate(200%));
		backdrop-filter: var(--glass-panel-filter, blur(20px) saturate(200%));
		background: var(--glass-panel-bg, rgba(255, 255, 255, 0.34));
		z-index: 0;
	}
	:global(.dark) .player-lg-backdrop {
		background: var(--glass-panel-bg, rgba(255, 255, 255, 0.06));
	}
	.player-lg-backdrop::before,
	.player-lg-backdrop::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.player-lg-backdrop::before {
		background: var(--glass-edge-gradient);
		opacity: var(--glass-edge-opacity, 0.7);
		mix-blend-mode: screen;
	}
	.player-lg-backdrop::after {
		background-image: var(--glass-specular), var(--glass-noise);
		opacity: calc(var(--glass-highlight-opacity, 0.34) + var(--glass-noise-opacity, 0));
		mix-blend-mode: overlay;
	}

	/* Gradient border layers */
	.player-lg-border {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		z-index: 3;
		padding: 1.5px;
		-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		mask-composite: exclude;
		box-shadow:
			0 0 0 0.5px rgba(255, 255, 255, 0.4) inset,
			0 1px 3px rgba(255, 255, 255, 0.2) inset;
		transition: background 0.3s ease;
	}
	.player-lg-border-screen {
		mix-blend-mode: screen;
		opacity: var(--glass-edge-opacity, 0.25);
		background: var(--glass-edge-gradient);
	}
	.player-lg-border-overlay {
		mix-blend-mode: overlay;
		background: var(--glass-specular);
	}

	/* Hover glow */
	.player-lg-hover-glow {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		z-index: 2;
		opacity: 0;
		background-image: radial-gradient(
			circle at 50% 0%,
			rgba(255, 255, 255, 0.68) 0%,
			rgba(255, 255, 255, 0.24) 28%,
			rgba(255, 255, 255, 0) 62%
		);
		mix-blend-mode: overlay;
		transition: opacity 0.35s ease;
	}
	.player-full:hover .player-lg-hover-glow {
		opacity: var(--glass-highlight-opacity, 0.5);
	}

	/* Content z-index above glass layers */
	.player-full > :global(*:not(.player-lg-backdrop):not(.player-lg-border):not(.player-lg-hover-glow)) {
		position: relative;
		z-index: 5;
	}

	/* Text readability */
	.player-full :global(*) {
		text-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.04);
	}
	:global(.dark) .player-full :global(*) {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	/* Mobile */
	@media (max-width: 768px) {
		.dynamic-island.di-playing-pill {
			width: 110px;
		}
		.dynamic-island.di-playing-pill.with-lyric {
			width: 144px;
		}
		.dynamic-island.di-status-pill {
			width: 116px;
		}
		.di-lyric {
			font-size: 0.66rem;
		}
		.di-waveform {
			display: none;
		}
		.di-quick-btn {
			display: none;
		}
		.player-panel {
			top: 50px;
			width: calc(100vw - 24px);
		}
		.player-lg-backdrop {
			-webkit-backdrop-filter: var(--glass-panel-filter, blur(9px) saturate(150%));
			backdrop-filter: var(--glass-panel-filter, blur(9px) saturate(150%));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dynamic-island,
		.di-quick-btn,
		.player-full,
		.player-lg-hover-glow {
			transition: none;
		}
		.di-waveform.active span,
		.di-status-dot {
			animation: none;
		}
	}

	@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
		.player-lg-backdrop {
			-webkit-backdrop-filter: none;
			backdrop-filter: none;
			background: var(--glass-fallback-bg, rgba(26, 26, 30, 0.92));
		}
		.player-lg-backdrop::before,
		.player-lg-backdrop::after,
		.player-lg-border,
		.player-lg-hover-glow {
			display: none;
		}
	}

	:global(html.coarse-pointer) .player-full:hover .player-lg-hover-glow,
	:global(html.reduced-motion) .player-full:hover .player-lg-hover-glow {
		opacity: 0;
	}
</style>
