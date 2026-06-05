<!--
  NowPlayingInfo.svelte — 封面 + 标题 + 歌手
-->
<script lang="ts">
import { musicStore } from "./music-store.svelte";

let coverUrl = $derived(
	musicStore.currentSong?.cover
		? `${musicStore.currentSong.cover}?param=120y120`
		: "",
);
let title = $derived(musicStore.currentSong?.name || "未播放");
let artist = $derived(musicStore.currentSong?.artist || "--");
let currentLyric = $derived(musicStore.currentLyricText);
let nextLyric = $derived(musicStore.nextLyricText);
let isFavorite = $derived(musicStore.isFavorite(musicStore.currentSong?.id));
</script>

<div class="now-playing">
	<!-- Cover background gradient -->
	<div class="cover-bg">
		{#if coverUrl}
			<img src={coverUrl} alt="" aria-hidden="true" />
		{/if}
	</div>

	<div class="info-row">
		{#if coverUrl}
			<img
				src={coverUrl}
				alt={title}
				class="cover cover-spin"
				class:playing={musicStore.isPlaying}
			/>
		{:else}
			<div class="cover cover-placeholder"></div>
		{/if}

		<div class="text-info">
			<div class="title">{title}</div>
			<div class="artist">{artist}</div>
			<div class="lyric-lines" aria-live="polite">
				<div class="lyric-current">{currentLyric}</div>
				{#if nextLyric}
					<div class="lyric-next">{nextLyric}</div>
				{/if}
			</div>
		</div>

		<button
			type="button"
			class="favorite-btn"
			class:active={isFavorite}
			aria-label={isFavorite ? "取消收藏" : "收藏歌曲"}
			disabled={!musicStore.currentSong}
			onclick={() => musicStore.toggleFavorite()}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
				<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
			</svg>
		</button>
	</div>
</div>

<style>
	.now-playing {
		position: relative;
	}

	.cover-bg {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background:
			radial-gradient(circle at 24% 8%, oklch(0.7 0.18 var(--hue) / 0.28), transparent 45%),
			linear-gradient(to bottom, oklch(0.65 0.15 var(--hue) / 0.22), transparent);
	}
	.cover-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(26px) saturate(1.25);
		opacity: 0.28;
		transform: scale(1.25);
	}

	.info-row {
		position: relative;
		padding: 16px;
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.cover {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		object-fit: cover;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		flex-shrink: 0;
		background: oklch(0.85 0 0);
	}
	:global(.dark) .cover {
		background: oklch(0.35 0 0);
	}

	.cover-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.text-info {
		flex: 1;
		min-width: 0;
		padding-top: 4px;
	}

	.title {
		font-size: 1rem;
		font-weight: 600;
		color: oklch(0.3 0 0);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.dark) .title {
		color: oklch(0.92 0 0);
	}

	.artist {
		font-size: 0.875rem;
		color: oklch(0.55 0 0);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-top: 2px;
	}
	:global(.dark) .artist {
		color: oklch(0.65 0 0);
	}

	.lyric-lines {
		margin-top: 8px;
		min-height: 34px;
	}

	.lyric-current,
	.lyric-next {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lyric-current {
		font-size: 0.78rem;
		font-weight: 600;
		color: oklch(0.38 0 0);
	}
	:global(.dark) .lyric-current {
		color: oklch(0.86 0 0);
	}

	.lyric-next {
		margin-top: 2px;
		font-size: 0.72rem;
		color: oklch(0.55 0 0);
	}
	:global(.dark) .lyric-next {
		color: oklch(0.62 0 0);
	}

	.favorite-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		background: rgba(255, 255, 255, 0.22);
		color: oklch(0.52 0 0);
		cursor: pointer;
		transition:
			background 0.2s ease,
			color 0.2s ease,
			transform 0.2s ease;
		flex-shrink: 0;
	}
	.favorite-btn:hover:not(:disabled) {
		transform: scale(1.06);
		background: rgba(255, 255, 255, 0.36);
	}
	.favorite-btn.active {
		color: oklch(0.65 0.22 25);
	}
	.favorite-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	:global(.dark) .favorite-btn {
		background: rgba(255, 255, 255, 0.08);
		color: oklch(0.7 0 0);
	}
	:global(.dark) .favorite-btn.active {
		color: oklch(0.72 0.22 25);
	}
</style>
