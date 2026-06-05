<!--
  PlayerPlaylist.svelte — 播放列表
  使用 Svelte {#each} 替代原来的 innerHTML 拼接。
-->
<script lang="ts">
import { musicStore } from "./music-store.svelte";
import type { Song } from "./types";

type PlaylistTab = "queue" | "recent" | "favorites";

let activeTab: PlaylistTab = $state("queue");

let tabSongs = $derived.by(() => {
	if (activeTab === "recent") return musicStore.recentSongs;
	if (activeTab === "favorites") return musicStore.favoriteSongs;
	return musicStore.playlist;
});

let emptyText = $derived.by(() => {
	if (activeTab === "recent") return "暂无最近播放";
	if (activeTab === "favorites") return "暂无收藏歌曲";
	return "暂无歌曲";
});

function playSong(song: Song, index: number) {
	if (activeTab === "queue") {
		musicStore.playAtIndex(index);
		return;
	}
	musicStore.playSong(song);
}

function removeFromQueue(e: MouseEvent, index: number) {
	e.stopPropagation();
	musicStore.removeSong(index);
}

function toggleFavorite(e: MouseEvent, song: Song) {
	e.stopPropagation();
	musicStore.toggleFavorite(song);
}
</script>

<div class="playlist-header">
	<span>播放列表</span>
	<div class="playlist-tabs" aria-label="播放列表视图">
		<button
			type="button"
			class:active={activeTab === "queue"}
			onclick={() => activeTab = "queue"}
		>
			队列
		</button>
		<button
			type="button"
			class:active={activeTab === "recent"}
			onclick={() => activeTab = "recent"}
		>
			最近
		</button>
		<button
			type="button"
			class:active={activeTab === "favorites"}
			onclick={() => activeTab = "favorites"}
		>
			收藏
		</button>
	</div>
</div>

<div class="playlist-items">
	{#each tabSongs as song, index (song.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="playlist-item"
			class:active={activeTab === "queue" && index === musicStore.currentIndex}
			onclick={() => playSong(song, index)}
			onkeydown={(e) => e.key === "Enter" && playSong(song, index)}
			role="button"
			tabindex="0"
		>
			<img
				src="{song.cover}?param=40y40"
				alt={song.name}
				class="item-cover"
			/>
			<div class="item-info">
				<div class="item-name" class:highlight={song.id === musicStore.currentSong?.id}>
					{song.name}
				</div>
				<div class="item-artist">{song.artist}</div>
			</div>
			<button
				type="button"
				class="favorite-btn"
				class:active={musicStore.isFavorite(song.id)}
				aria-label={musicStore.isFavorite(song.id) ? "取消收藏" : "收藏"}
				onclick={(e) => toggleFavorite(e, song)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill={musicStore.isFavorite(song.id) ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
					<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
				</svg>
			</button>
			{#if activeTab === "queue"}
				<button
					type="button"
					class="remove-btn"
					aria-label="移除"
					onclick={(e) => removeFromQueue(e, index)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			{/if}
		</div>
	{/each}

	{#if activeTab === "recent" && musicStore.recentSongs.length > 0}
		<button
			type="button"
			class="clear-recent"
			onclick={() => musicStore.clearRecentSongs()}
		>
			清空最近播放
		</button>
	{/if}

	{#if tabSongs.length === 0}
		<div class="empty-msg">{emptyText}</div>
	{/if}
</div>

<style>
	.playlist-header {
		padding: 8px 12px 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.75rem;
		color: oklch(0.55 0 0);
		font-weight: 500;
	}
	:global(.dark) .playlist-header {
		color: oklch(0.6 0 0);
	}

	.playlist-tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border-radius: 999px;
		background: oklch(0.95 0 0 / 0.72);
	}
	:global(.dark) .playlist-tabs {
		background: oklch(0.24 0 0 / 0.72);
	}
	.playlist-tabs button {
		height: 22px;
		border: 0;
		border-radius: 999px;
		padding: 0 8px;
		background: transparent;
		color: inherit;
		font-size: 0.7rem;
		cursor: pointer;
	}
	.playlist-tabs button.active {
		background: oklch(1 0 0 / 0.82);
		color: oklch(0.38 0 0);
	}
	:global(.dark) .playlist-tabs button.active {
		background: oklch(0.34 0 0 / 0.9);
		color: oklch(0.9 0 0);
	}

	.playlist-items {
		padding-bottom: 8px;
	}

	.playlist-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
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

	.favorite-btn,
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
	.favorite-btn:hover,
	.favorite-btn.active {
		background: oklch(0.92 0.02 25);
		color: oklch(0.62 0.22 25);
	}
	.remove-btn:hover {
		background: oklch(0.9 0 0);
		color: oklch(0.5 0.2 25);
	}
	:global(.dark) .favorite-btn:hover,
	:global(.dark) .favorite-btn.active {
		background: oklch(0.32 0.05 25);
		color: oklch(0.68 0.22 25);
	}
	:global(.dark) .remove-btn:hover {
		background: oklch(0.35 0 0);
		color: oklch(0.6 0.2 25);
	}

	.clear-recent {
		margin: 4px 12px 0;
		width: calc(100% - 24px);
		height: 30px;
		border: 0;
		border-radius: 8px;
		background: oklch(0.94 0 0 / 0.8);
		color: oklch(0.48 0 0);
		font-size: 0.75rem;
		cursor: pointer;
	}
	.clear-recent:hover {
		background: oklch(0.9 0 0);
	}
	:global(.dark) .clear-recent {
		background: oklch(0.28 0 0 / 0.8);
		color: oklch(0.68 0 0);
	}

	.empty-msg {
		padding: 16px;
		text-align: center;
		font-size: 0.8rem;
		color: oklch(0.6 0 0);
	}
</style>
