<!--
  PlayerFull.svelte — 展开态播放器 UI
  包含封面信息、进度条、控制按钮、音量/音质、播放列表。
  由 DynamicIsland 的展开面板渲染。
-->
<script lang="ts">
import NowPlayingInfo from "./NowPlayingInfo.svelte";
import PlayerControls from "./PlayerControls.svelte";
import PlayerPlaylist from "./PlayerPlaylist.svelte";
import { musicStore } from "./music-store.svelte";
</script>

<div class="player-inner">
	<!-- Header: cover + title + artist -->
	<div class="player-header">
		<NowPlayingInfo />
	</div>

	<!-- Progress + Controls + Volume/Quality -->
	<PlayerControls />

	<!-- Playlist (toggleable) -->
	{#if musicStore.showPlaylist}
		<div class="playlist-container">
			<PlayerPlaylist />
		</div>
	{/if}
</div>

<style>
	.player-inner {
		padding-bottom: 4px;
	}

	.player-header {
		position: relative;
	}

	.playlist-container {
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		max-height: 192px;
		overflow-y: auto;
	}
	:global(.dark) .playlist-container {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.playlist-container::-webkit-scrollbar {
		width: 4px;
	}
	.playlist-container::-webkit-scrollbar-track {
		background: transparent;
	}
	.playlist-container::-webkit-scrollbar-thumb {
		background: oklch(0.7 0.1 var(--hue));
		border-radius: 2px;
	}
</style>
