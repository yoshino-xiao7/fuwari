<!--
  MusicPlayer.svelte — 顶层容器
  初始化 music store，组合 DynamicIsland 子组件。
  在 Layout.astro 中以 <MusicPlayer client:only="svelte" /> 挂载。
-->
<script lang="ts">
import { onDestroy, onMount } from "svelte";
import DynamicIsland from "./DynamicIsland.svelte";
import { musicStore } from "./music-store.svelte";

onMount(() => {
	musicStore.init();
});

// Sync audio volume when reactive volume changes
$effect(() => {
	// no-op read handled by the getter itself
	musicStore.isMuted;
});

// Fetch lyrics and dispatch songChange when current song changes
$effect(() => {
	const song = musicStore.currentSong;
	if (song) {
		musicStore.fetchLyrics(song.id);
		window.dispatchEvent(
			new CustomEvent("music:songChange", {
				detail: {
					id: song.id,
					name: song.name,
					artist: song.artist,
					cover: musicStore.coverUrl,
				},
			}),
		);
	}
});

onDestroy(() => {
	musicStore.destroy();
});
</script>

<DynamicIsland />
