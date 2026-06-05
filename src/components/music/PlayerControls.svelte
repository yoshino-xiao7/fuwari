<!--
  PlayerControls.svelte — 播放/暂停/上下首/进度条/音量/音质/列表切换
-->
<script lang="ts">
import PlayerQualitySelect from "./PlayerQualitySelect.svelte";
import { musicStore } from "./music-store.svelte";

let progressValue = $derived(musicStore.progressPercent);
let currentTimeStr = $derived(musicStore.formatTime(musicStore.currentTime));
let durationStr = $derived(musicStore.formatTime(musicStore.duration));
let volumePercent = $derived(Math.round(musicStore.volume * 100));

function handleProgressInput(e: Event) {
	const target = e.target as HTMLInputElement;
	musicStore.seek(Number.parseFloat(target.value));
}

function handleVolumeInput(e: Event) {
	const target = e.target as HTMLInputElement;
	musicStore.setVolume(Number.parseFloat(target.value) / 100);
}
</script>

<!-- Progress bar -->
<div class="px-4 pb-2">
	<div class="progress-track">
		<input
			type="range"
			min="0"
			max="100"
			step="0.1"
			value={progressValue}
			oninput={handleProgressInput}
			class="progress-range"
		/>
		<div
			class="progress-fill"
			style="width: {progressValue}%"
		></div>
	</div>
	<div class="time-row">
		<span>{currentTimeStr}</span>
		<span>{durationStr}</span>
	</div>
</div>

<!-- Control buttons -->
<div class="controls-row">
	<!-- Prev -->
	<button
		type="button"
		class="ctrl-btn"
		aria-label="上一首"
		onclick={() => musicStore.prev()}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
		</svg>
	</button>

	<!-- Play/Pause -->
	<button
		type="button"
		class="play-btn"
		class:playing={musicStore.isPlaying}
		aria-label="播放/暂停"
		onclick={() => musicStore.togglePlay()}
	>
		{#if musicStore.isPlaying}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 4h4v16H6zM14 4h4v16h-4z" />
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>

	<!-- Next -->
	<button
		type="button"
		class="ctrl-btn"
		aria-label="下一首"
		onclick={() => musicStore.next()}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
		</svg>
	</button>
</div>

<!-- Volume + Quality + Playlist toggle -->
<div class="bottom-row">
	<!-- Volume -->
	<div class="volume-group">
		<button
			type="button"
			class="vol-btn"
			aria-label="静音"
			onclick={() => musicStore.toggleMute()}
		>
			{#if musicStore.isMuted}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<line x1="23" y1="9" x2="17" y2="15" />
					<line x1="17" y1="9" x2="23" y2="15" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
				</svg>
			{/if}
		</button>
		<input
			type="range"
			min="0"
			max="100"
			value={volumePercent}
			oninput={handleVolumeInput}
			class="volume-range"
		/>
	</div>

	<!-- Quality -->
	<PlayerQualitySelect />

	<!-- Playlist toggle -->
	<button
		type="button"
		class="list-btn"
		aria-label="播放列表"
		onclick={() => musicStore.togglePlaylist()}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</svg>
	</button>
</div>

<style>
	/* Progress bar */
	.progress-track {
		position: relative;
	}

	.progress-range {
		width: 100%;
		height: 4px;
		background: oklch(0.85 0 0);
		border-radius: 9999px;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		outline: none;
	}
	:global(.dark) .progress-range {
		background: oklch(0.35 0 0);
	}
	.progress-range::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: oklch(0.65 0.2 var(--hue));
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.progress-track:hover .progress-range::-webkit-slider-thumb {
		opacity: 1;
	}

	.progress-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 4px;
		background: oklch(0.65 0.2 var(--hue));
		border-radius: 9999px;
		pointer-events: none;
		transition: width 0.2s linear;
	}

	.time-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: oklch(0.55 0 0);
		margin-top: 4px;
	}
	:global(.dark) .time-row {
		color: oklch(0.6 0 0);
	}

	/* Controls */
	.controls-row {
		padding: 0 16px 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	.ctrl-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		color: oklch(0.45 0 0);
		background: transparent;
		border: none;
		cursor: pointer;
	}
	.ctrl-btn:hover {
		background: oklch(0.93 0 0);
	}
	:global(.dark) .ctrl-btn {
		color: oklch(0.7 0 0);
	}
	:global(.dark) .ctrl-btn:hover {
		background: oklch(0.3 0 0);
	}

	.play-btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: oklch(0.65 0.2 var(--hue));
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		box-shadow: 0 4px 16px oklch(0.65 0.2 var(--hue) / 0.3);
		border: none;
		cursor: pointer;
	}
	.play-btn:hover {
		background: oklch(0.55 0.25 var(--hue));
		transform: scale(1.05);
	}

	/* Bottom row */
	.bottom-row {
		padding: 0 16px 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.volume-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.vol-btn,
	.list-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		color: oklch(0.55 0 0);
		background: transparent;
		border: none;
		cursor: pointer;
	}
	.vol-btn:hover,
	.list-btn:hover {
		background: oklch(0.93 0 0);
	}
	:global(.dark) .vol-btn,
	:global(.dark) .list-btn {
		color: oklch(0.6 0 0);
	}
	:global(.dark) .vol-btn:hover,
	:global(.dark) .list-btn:hover {
		background: oklch(0.3 0 0);
	}

	.volume-range {
		width: 64px;
		height: 4px;
		background: oklch(0.85 0 0);
		border-radius: 9999px;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		outline: none;
	}
	:global(.dark) .volume-range {
		background: oklch(0.35 0 0);
	}
	.volume-range::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: oklch(0.65 0.2 var(--hue));
		cursor: pointer;
	}
</style>
