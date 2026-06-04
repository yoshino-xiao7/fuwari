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
</script>

<div class="now-playing">
	<!-- Cover background gradient -->
	<div class="cover-bg" />

	<div class="info-row">
		{#if coverUrl}
			<img
				src={coverUrl}
				alt={title}
				class="cover cover-spin"
				class:playing={musicStore.isPlaying}
			/>
		{:else}
			<div class="cover cover-placeholder" />
		{/if}

		<div class="text-info">
			<div class="title">{title}</div>
			<div class="artist">{artist}</div>
		</div>
	</div>
</div>

<style>
	.now-playing {
		position: relative;
	}

	.cover-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			oklch(0.65 0.15 var(--hue) / 0.3),
			transparent
		);
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
</style>
