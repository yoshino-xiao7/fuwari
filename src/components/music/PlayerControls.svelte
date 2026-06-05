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
let displayedVolumePercent = $derived(musicStore.isMuted ? 0 : volumePercent);
let playModeLabel = $derived(musicStore.playModeLabel);

function handleProgressInput(e: Event) {
	const target = e.target as HTMLInputElement;
	musicStore.seek(Number.parseFloat(target.value));
}

function handleVolumeInput(e: Event) {
	const target = e.target as HTMLInputElement;
	musicStore.setVolume(Number.parseFloat(target.value) / 100);
}
</script>

<div class="control-dock" aria-label="播放器控制台">
	<!-- Progress bar -->
	<div class="progress-section">
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
			title="上一首"
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
			title="播放/暂停"
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
			title="下一首"
			onclick={() => musicStore.next()}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
			</svg>
		</button>
	</div>

	<!-- Volume + Mode + Quality + Search/Playlist toggles -->
	<div class="bottom-row">
		<!-- Volume -->
		<div class="volume-group">
			<button
				type="button"
				class="vol-btn"
				aria-label={musicStore.isMuted ? "取消静音" : "静音"}
				title={musicStore.isMuted ? "取消静音" : "静音"}
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
				value={displayedVolumePercent}
				aria-label="音量"
				aria-valuetext={`${displayedVolumePercent}%`}
				oninput={handleVolumeInput}
				class="volume-range"
			/>
		</div>

		<button
			type="button"
			class="icon-btn"
			class:active={musicStore.playMode !== "sequence"}
			aria-label={playModeLabel}
			title={playModeLabel}
			onclick={() => musicStore.cyclePlayMode()}
		>
			{#if musicStore.playMode === "repeat-one"}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m17 2 4 4-4 4" />
					<path d="M3 11V9a4 4 0 0 1 4-4h14" />
					<path d="m7 22-4-4 4-4" />
					<path d="M21 13v2a4 4 0 0 1-4 4H3" />
					<path d="M11 10h1v5" />
				</svg>
			{:else if musicStore.playMode === "shuffle"}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M16 3h5v5" />
					<path d="M4 20 21 3" />
					<path d="M21 16v5h-5" />
					<path d="M15 15l6 6" />
					<path d="M4 4l5 5" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m17 2 4 4-4 4" />
					<path d="M3 11V9a4 4 0 0 1 4-4h14" />
					<path d="m7 22-4-4 4-4" />
					<path d="M21 13v2a4 4 0 0 1-4 4H3" />
				</svg>
			{/if}
		</button>

		<!-- Quality -->
		<PlayerQualitySelect />

		<button
			type="button"
			class="icon-btn"
			class:active={musicStore.showSearch}
			aria-label="搜索歌曲"
			title="搜索歌曲"
			onclick={() => musicStore.toggleSearch()}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.35-4.35" />
			</svg>
		</button>

		<!-- Playlist toggle -->
		<button
			type="button"
			class="icon-btn"
			class:active={musicStore.showPlaylist}
			aria-label="播放列表"
			title="播放列表"
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
</div>

<style>
	.control-dock {
		margin: 0 12px 12px;
		padding: 12px;
		border-radius: 14px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.12)),
			rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.34);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.46) inset,
			0 0 0 1px rgba(255, 255, 255, 0.08),
			0 8px 20px rgba(0, 0, 0, 0.07);
	}
	:global(.dark) .control-dock {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
			rgba(10, 10, 14, 0.3);
		border-color: rgba(255, 255, 255, 0.11);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.1) inset,
			0 0 0 1px rgba(255, 255, 255, 0.025),
			0 10px 24px rgba(0, 0, 0, 0.22);
	}

	/* Progress bar */
	.progress-section {
		padding: 0 4px 2px;
	}

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
	.progress-range:focus-visible::-webkit-slider-thumb,
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
		color: oklch(0.45 0 0);
		margin-top: 4px;
		font-weight: 600;
	}
	:global(.dark) .time-row {
		color: oklch(0.7 0 0);
	}

	/* Controls */
	.controls-row {
		padding: 8px 0 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 18px;
	}

	.ctrl-btn {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			transform 0.2s ease;
		color: oklch(0.38 0 0);
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.35) inset,
			0 4px 12px rgba(0, 0, 0, 0.06);
		cursor: pointer;
	}
	.ctrl-btn:hover {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.34);
		border-color: rgba(255, 255, 255, 0.48);
	}
	.ctrl-btn:focus-visible,
	.play-btn:focus-visible,
	.vol-btn:focus-visible,
	.icon-btn:focus-visible {
		outline: 2px solid oklch(0.72 0.2 var(--hue));
		outline-offset: 3px;
	}
	:global(.dark) .ctrl-btn {
		color: oklch(0.82 0 0);
		background: rgba(255, 255, 255, 0.065);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.08) inset,
			0 6px 14px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .ctrl-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.18);
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
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.42) inset,
			0 8px 22px oklch(0.65 0.2 var(--hue) / 0.32);
		border: 1px solid oklch(0.85 0.14 var(--hue) / 0.34);
		cursor: pointer;
	}
	.play-btn:hover {
		background: oklch(0.55 0.25 var(--hue));
		transform: scale(1.05);
	}

	/* Bottom row */
	.bottom-row {
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 7px;
		row-gap: 8px;
		flex-wrap: wrap;
	}

	.volume-group {
		display: flex;
		align-items: center;
		gap: 7px;
		height: 34px;
		flex: 1 1 104px;
		min-width: 100px;
		max-width: 118px;
		padding: 0 8px 0 4px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.22);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.28) inset;
	}
	:global(.dark) .volume-group {
		background: rgba(255, 255, 255, 0.045);
		border-color: rgba(255, 255, 255, 0.09);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
	}

	.vol-btn,
	.icon-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			transform 0.2s ease,
			box-shadow 0.2s ease;
		color: oklch(0.38 0 0);
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.24);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.24) inset;
		cursor: pointer;
	}
	.vol-btn:hover,
	.icon-btn:hover,
	.icon-btn.active {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.32);
		border-color: rgba(255, 255, 255, 0.42);
	}
	.icon-btn.active {
		color: oklch(0.58 0.2 var(--hue));
		background: oklch(0.7 0.18 var(--hue) / 0.2);
		border-color: oklch(0.72 0.18 var(--hue) / 0.42);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.34) inset,
			0 4px 14px oklch(0.65 0.18 var(--hue) / 0.16);
	}
	:global(.dark) .vol-btn,
	:global(.dark) .icon-btn {
		color: oklch(0.8 0 0);
		background: rgba(255, 255, 255, 0.055);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
	}
	:global(.dark) .vol-btn:hover,
	:global(.dark) .icon-btn:hover,
	:global(.dark) .icon-btn.active {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.18);
	}
	:global(.dark) .icon-btn.active {
		color: oklch(0.78 0.18 var(--hue));
		background: oklch(0.62 0.16 var(--hue) / 0.18);
		border-color: oklch(0.7 0.16 var(--hue) / 0.28);
	}

	.volume-range {
		width: 58px;
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

	@media (max-width: 420px) {
		.control-dock {
			margin: 0 10px 10px;
			padding: 10px;
		}
		.bottom-row {
			gap: 5px;
		}
		.volume-range {
			width: 48px;
		}
		.vol-btn,
		.icon-btn {
			width: 30px;
			height: 30px;
		}
	}
</style>
