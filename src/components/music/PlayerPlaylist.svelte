<!--
  PlayerPlaylist.svelte — 播放列表
  使用 Svelte {#each} 替代原来的 innerHTML 拼接。
-->
<script lang="ts">
import { musicStore } from "./music-store.svelte";
</script>

<div class="playlist-header">
	<span>播放列表</span>
</div>

<div class="playlist-items">
	{#each musicStore.playlist as song, index (song.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="playlist-item"
			class:active={index === musicStore.currentIndex}
			onclick={() => musicStore.playAtIndex(index)}
			onkeydown={(e) => e.key === "Enter" && musicStore.playAtIndex(index)}
			role="button"
			tabindex="0"
		>
			<img
				src="{song.cover}?param=40y40"
				alt={song.name}
				class="item-cover"
			/>
			<div class="item-info">
				<div class="item-name" class:highlight={index === musicStore.currentIndex}>
					{song.name}
				</div>
				<div class="item-artist">{song.artist}</div>
			</div>
			<button
				type="button"
				class="remove-btn"
				aria-label="移除"
				onclick={(e) => { e.stopPropagation(); musicStore.removeSong(index); }}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	{/each}

	{#if musicStore.playlist.length === 0}
		<div class="empty-msg">暂无歌曲</div>
	{/if}
</div>

<style>
	.playlist-header {
		padding: 8px 16px 4px;
		font-size: 0.75rem;
		color: oklch(0.55 0 0);
		font-weight: 500;
	}
	:global(.dark) .playlist-header {
		color: oklch(0.6 0 0);
	}

	.playlist-items {
		padding-bottom: 8px;
	}

	.playlist-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.playlist-item:hover {
		background: oklch(0.95 0 0);
	}
	:global(.dark) .playlist-item:hover {
		background: oklch(0.3 0 0 / 0.5);
	}
	.playlist-item.active {
		background: oklch(0.65 0.2 var(--hue) / 0.1);
	}

	.item-cover {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: oklch(0.3 0 0);
	}
	.item-name.highlight {
		color: oklch(0.65 0.2 var(--hue));
	}
	:global(.dark) .item-name {
		color: oklch(0.85 0 0);
	}
	:global(.dark) .item-name.highlight {
		color: oklch(0.7 0.2 var(--hue));
	}

	.item-artist {
		font-size: 0.75rem;
		color: oklch(0.55 0 0);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.dark) .item-artist {
		color: oklch(0.55 0 0);
	}

	.remove-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		color: oklch(0.6 0 0);
		background: transparent;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
	}
	.remove-btn:hover {
		background: oklch(0.9 0 0);
		color: oklch(0.5 0.2 25);
	}
	:global(.dark) .remove-btn:hover {
		background: oklch(0.35 0 0);
		color: oklch(0.6 0.2 25);
	}

	.empty-msg {
		padding: 16px;
		text-align: center;
		font-size: 0.8rem;
		color: oklch(0.6 0 0);
	}
</style>
