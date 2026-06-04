<!--
  DynamicIsland.svelte — Apple-style 灵动岛
  Idle: 时钟 | Playing: 封面+歌词+波形 | Expanded: 完整播放器面板
-->
<script lang="ts">
import { onMount } from "svelte";
import { scale } from "svelte/transition";
import PlayerFull from "./PlayerFull.svelte";
import { musicStore } from "./music-store.svelte";

let islandEl: HTMLElement | undefined = $state();
let clock = $state("00:00:00");
let lyricText = $state("♪ 播放中");
let playerPanelStyle = $state("");

// Derived values
let hasSong = $derived(musicStore.currentSong !== null);
let isActive = $derived(musicStore.isPlaying && hasSong);
let coverUrl = $derived(
	musicStore.currentSong?.cover
		? `${musicStore.currentSong.cover}?param=60y60`
		: "",
);

// Island CSS class
let islandClass = $derived.by(() => {
	if (musicStore.isExpanded) return "dynamic-island di-idle";
	if (isActive) {
		return "dynamic-island di-playing-pill with-lyric";
	}
	return "dynamic-island di-idle";
});

onMount(() => {
	// Clock interval
	clock = musicStore.formatClock();
	const clockId = setInterval(() => {
		if (!isActive || musicStore.isExpanded) {
			clock = musicStore.formatClock();
		}
	}, 1000);

	// Poll for cover sync (fallback)
	const pollId = setInterval(() => {
		// The store already drives reactivity; this is a safety net.
	}, 3000);

	return () => {
		clearInterval(clockId);
		clearInterval(pollId);
	};
});

// Update lyrics on timeupdate
$effect(() => {
	const _t = musicStore.currentTime;
	if (musicStore.isPlaying && hasSong) {
		lyricText = musicStore.updateLyric(_t);
	}
});

// Auto-return to idle 5s after pause
$effect(() => {
	if (!musicStore.isPlaying && !musicStore.isExpanded && hasSong) {
		const timer = setTimeout(() => {
			// State auto-updates via $derived, nothing needed
		}, 5000);
		return () => clearTimeout(timer);
	}
});

function handleIslandClick() {
	if (musicStore.isExpanded) {
		closePlayer();
	} else {
		openPlayer();
	}
}

function openPlayer() {
	if (!islandEl) return;
	const rect = islandEl.getBoundingClientRect();
	playerPanelStyle = [
		"position: fixed",
		`top: ${rect.bottom + 8}px`,
		`left: ${rect.left + rect.width / 2}px`,
		"transform: translateX(-50%)",
		"z-index: 200",
	].join(";");
	musicStore.isExpanded = true;
}

function closePlayer() {
	musicStore.isExpanded = false;
}

function handleBackdropClick() {
	closePlayer();
}
</script>

<!-- Dynamic Island pill -->
<div
	bind:this={islandEl}
	class={islandClass}
	title="音乐播放器"
	onclick={handleIslandClick}
	onkeydown={(e) => e.key === "Enter" && handleIslandClick()}
	role="button"
	tabindex="0"
>
	{#if isActive && !musicStore.isExpanded}
		<!-- Playing: cover + lyric + waveform -->
		<div class="di-pill-playing">
			{#if coverUrl}
				<img
					src={coverUrl}
					alt=""
					class="di-cover cover-spin"
					class:playing={musicStore.isPlaying}
				/>
			{/if}
			<div class="di-lyric">{lyricText}</div>
			<div class="di-waveform active">
				<span /><span /><span /><span />
			</div>
		</div>
	{:else}
		<!-- Idle: clock -->
		<div class="di-pill-idle">
			<span class="di-clock">{clock}</span>
		</div>
	{/if}
</div>

<!-- Expanded player panel -->
{#if musicStore.isExpanded}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="di-backdrop" onclick={handleBackdropClick}></div>
	<div class="player-panel" style={playerPanelStyle}>
		<div
			class="player-full"
			class:playing={musicStore.isPlaying}
			in:scale={{ duration: 350, start: 0, opacity: 0, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			out:scale={{ duration: 250, opacity: 0, easing: (t) => t * t }}
		>
			<!-- Liquid Glass layers -->
			<div class="player-lg-backdrop" />
			<div class="player-lg-border player-lg-border-screen" />
			<div class="player-lg-border player-lg-border-overlay" />
			<div class="player-lg-hover-glow" />

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
		background: #111;
		border-radius: 99px;
		cursor: pointer;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
		z-index: 9999;
		overflow: hidden;
		flex-shrink: 0;
		transition:
			width 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.3s ease;
	}
	.dynamic-island:hover {
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
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
		font-weight: 500;
		letter-spacing: 0.02em;
		line-height: 1;
		transition: opacity 0.15s ease;
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

	/* Backdrop */
	.di-backdrop {
		position: fixed;
		inset: 0;
		z-index: 95;
		background: transparent;
	}

	/* Player panel container */
	.player-panel {
		pointer-events: auto;
	}

	/* ===== Player Liquid Glass ===== */
	.player-full {
		position: relative;
		width: 320px;
		border-radius: 16px;
		overflow: hidden;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.1),
			0 2px 8px rgba(0, 0, 0, 0.06);
		transition:
			transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
			box-shadow 0.35s ease;
	}
	.player-full:hover {
		box-shadow:
			0 12px 48px rgba(0, 0, 0, 0.15),
			0 4px 12px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .player-full {
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.3),
			0 2px 8px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .player-full:hover {
		box-shadow:
			0 12px 48px rgba(0, 0, 0, 0.4),
			0 4px 12px rgba(0, 0, 0, 0.25);
	}

	/* Glass backdrop layer */
	.player-lg-backdrop {
		position: absolute;
		inset: 0;
		backdrop-filter: blur(20px) saturate(200%);
		-webkit-backdrop-filter: blur(20px) saturate(200%);
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.5) 0%,
			rgba(255, 255, 255, 0.3) 50%,
			rgba(255, 255, 255, 0.4) 100%
		);
		z-index: 0;
	}
	:global(.dark) .player-lg-backdrop {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.04) 50%,
			rgba(255, 255, 255, 0.08) 100%
		);
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
		opacity: 0.25;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.0) 0%,
			rgba(255, 255, 255, 0.15) 33%,
			rgba(255, 255, 255, 0.45) 66%,
			rgba(255, 255, 255, 0.0) 100%
		);
	}
	.player-lg-border-overlay {
		mix-blend-mode: overlay;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.0) 0%,
			rgba(255, 255, 255, 0.35) 33%,
			rgba(255, 255, 255, 0.65) 66%,
			rgba(255, 255, 255, 0.0) 100%
		);
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
			rgba(255, 255, 255, 0.5) 0%,
			rgba(255, 255, 255, 0) 60%
		);
		mix-blend-mode: overlay;
		transition: opacity 0.35s ease;
	}
	.player-full:hover .player-lg-hover-glow {
		opacity: 0.5;
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
			width: 150px;
		}
		/* 降低 backdrop-filter 强度，修复 iOS Safari 毛玻璃过重 */
		.player-lg-backdrop {
			backdrop-filter: blur(12px) saturate(150%);
			-webkit-backdrop-filter: blur(12px) saturate(150%);
		}
	}
</style>
