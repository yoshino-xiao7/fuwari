<!--
  MusicPanelSearch.svelte — 展开面板内的紧凑音乐搜索
-->
<script lang="ts">
import { musicStore } from "./music-store.svelte";
import type { Song } from "./types";

type MusicApiArtist = {
	name?: unknown;
};

type MusicApiSong = {
	id?: unknown;
	name?: unknown;
	al?: {
		picUrl?: unknown;
	};
	ar?: MusicApiArtist[];
};

const FALLBACK_COVER =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%23666' width='40' height='40'/%3E%3Cpath fill='%23999' d='M17 11h13v4H20v11a4 4 0 1 1-3-3.87V11Z'/%3E%3C/svg%3E";

const isLocalhost =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1");
const MUSIC_API = isLocalhost
	? "http://localhost:9898/blog/music"
	: "https://api.yukiryou.icu/blog/music";

let keyword = $state("");
let searching = $state(false);
let errorMessage = $state("");
let songs: Song[] = $state([]);

async function doSearch() {
	const query = keyword.trim();
	if (!query || searching) return;

	searching = true;
	errorMessage = "";
	try {
		const res = await fetch(
			`${MUSIC_API}/search?keywords=${encodeURIComponent(query)}&limit=8`,
		);
		if (!res.ok) throw new Error(`搜索失败：${res.status}`);

		const json = await res.json();
		const rawSongs = Array.isArray(json.result?.songs) ? json.result.songs : [];
		songs = rawSongs.map(toSong).filter((song): song is Song => song !== null);
		if (songs.length === 0) {
			errorMessage = "没有找到相关歌曲";
		}
	} catch (e) {
		errorMessage = e instanceof Error ? e.message : "搜索失败，请稍后重试";
		songs = [];
	} finally {
		searching = false;
	}
}

function play(song: Song) {
	musicStore.playSong(song);
	musicStore.showSearch = false;
}

function add(song: Song) {
	musicStore.addSong(song, false);
}

function getText(value: unknown, fallback: string) {
	return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeCoverUrl(value: unknown) {
	if (typeof value !== "string" || !value.trim()) return "";
	try {
		const parsedUrl = new URL(value, window.location.href);
		if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
			return "";
		}
		return parsedUrl.href;
	} catch (_e) {
		return "";
	}
}

function toSong(song: MusicApiSong): Song | null {
	const id =
		typeof song.id === "number" || typeof song.id === "string" ? song.id : "";
	if (id === "") return null;

	const artist =
		song.ar
			?.map((a) => getText(a.name, ""))
			.filter(Boolean)
			.join(" / ") || "未知歌手";

	return {
		id,
		name: getText(song.name, "未知歌曲"),
		artist,
		cover: normalizeCoverUrl(song.al?.picUrl),
	};
}
</script>

<div class="panel-search">
	<div class="search-row">
		<input
			type="search"
			bind:value={keyword}
			placeholder="搜索歌曲或歌手"
			aria-label="搜索歌曲或歌手"
			onkeydown={(e) => e.key === "Enter" && doSearch()}
		/>
		<button
			type="button"
			aria-label="搜索"
			disabled={searching || !keyword.trim()}
			onclick={doSearch}
		>
			{#if searching}
				<span class="spinner" aria-hidden="true"></span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" />
				</svg>
			{/if}
		</button>
	</div>

	{#if errorMessage}
		<div class="search-message">{errorMessage}</div>
	{/if}

	{#if songs.length > 0}
		<div class="search-results">
			{#each songs as song (song.id)}
				<div class="search-item">
					<button
						type="button"
						class="song-main"
						onclick={() => play(song)}
					>
						<img
							src={song.cover ? `${song.cover}?param=44y44` : FALLBACK_COVER}
							alt={song.name}
						/>
						<span>
							<strong>{song.name}</strong>
							<small>{song.artist}</small>
						</span>
					</button>
					<button
						type="button"
						class="add-btn"
						aria-label="加入播放列表"
						onclick={() => add(song)}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.panel-search {
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		padding: 10px 12px 12px;
	}
	:global(.dark) .panel-search {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.search-row {
		display: flex;
		gap: 8px;
	}

	.search-row input {
		flex: 1;
		min-width: 0;
		height: 34px;
		border-radius: 8px;
		border: 1px solid oklch(0.86 0 0 / 0.85);
		background: oklch(1 0 0 / 0.62);
		padding: 0 10px;
		font-size: 0.8rem;
		color: oklch(0.32 0 0);
		outline: none;
	}
	:global(.dark) .search-row input {
		border-color: oklch(0.38 0 0 / 0.9);
		background: oklch(0.2 0 0 / 0.68);
		color: oklch(0.9 0 0);
	}

	.search-row button,
	.add-btn {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: oklch(0.65 0.2 var(--hue));
		color: white;
		cursor: pointer;
	}
	.search-row button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: white;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.search-message {
		padding: 10px 4px 0;
		font-size: 0.75rem;
		color: oklch(0.55 0 0);
	}

	.search-results {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 184px;
		overflow-y: auto;
	}

	.search-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.song-main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 9px;
		height: 44px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.song-main:hover {
		background: oklch(0.95 0 0 / 0.78);
	}
	:global(.dark) .song-main:hover {
		background: oklch(0.3 0 0 / 0.5);
	}

	.song-main img {
		width: 34px;
		height: 34px;
		border-radius: 6px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.song-main span {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.song-main strong,
	.song-main small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.song-main strong {
		font-size: 0.8rem;
		font-weight: 600;
		color: oklch(0.32 0 0);
	}
	:global(.dark) .song-main strong {
		color: oklch(0.9 0 0);
	}
	.song-main small {
		font-size: 0.72rem;
		color: oklch(0.55 0 0);
	}

	.add-btn {
		background: transparent;
		color: oklch(0.55 0 0);
	}
	.add-btn:hover {
		background: oklch(0.93 0 0);
	}
	:global(.dark) .add-btn {
		color: oklch(0.66 0 0);
	}
	:global(.dark) .add-btn:hover {
		background: oklch(0.3 0 0);
	}
</style>
