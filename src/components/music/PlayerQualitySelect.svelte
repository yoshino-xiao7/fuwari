<!--
  PlayerQualitySelect.svelte — 音质选择下拉框
-->
<script lang="ts">
import { musicStore } from "./music-store.svelte";
import type { QualityLevel } from "./types";

const options: { value: QualityLevel; label: string }[] = [
	{ value: "standard", label: "标准" },
	{ value: "higher", label: "较高" },
	{ value: "exhigh", label: "极高" },
	{ value: "lossless", label: "无损" },
	{ value: "hires", label: "Hi-Res" },
];

function handleChange(e: Event) {
	const target = e.target as HTMLSelectElement;
	musicStore.setQuality(target.value as QualityLevel);
}
</script>

<div class="quality-select-wrapper">
	<select
		class="quality-select"
		value={musicStore.quality}
		onchange={handleChange}
		aria-label="音质选择"
	>
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<svg
		class="quality-arrow"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
	>
		<path d="M6 9l6 6 6-6" />
	</svg>
</div>

<style>
	.quality-select-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.quality-select {
		appearance: none;
		-webkit-appearance: none;
		height: 28px;
		padding: 0 26px 0 10px;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		border-radius: 14px;
		background: linear-gradient(
			135deg,
			oklch(0.65 0.15 var(--hue) / 0.2),
			oklch(0.65 0.15 var(--hue) / 0.08)
		);
		color: oklch(0.45 0.1 var(--hue));
		border: 1.5px solid oklch(0.65 0.15 var(--hue) / 0.3);
		cursor: pointer;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.25s ease;
		outline: none;
	}
	.quality-select:hover {
		background: linear-gradient(
			135deg,
			oklch(0.65 0.15 var(--hue) / 0.35),
			oklch(0.65 0.15 var(--hue) / 0.15)
		);
		border-color: oklch(0.65 0.15 var(--hue) / 0.5);
		box-shadow: 0 2px 12px oklch(0.65 0.2 var(--hue) / 0.2);
	}
	.quality-select:focus {
		border-color: oklch(0.65 0.2 var(--hue) / 0.7);
		box-shadow:
			0 0 0 3px oklch(0.65 0.2 var(--hue) / 0.15),
			0 2px 12px oklch(0.65 0.2 var(--hue) / 0.2);
	}
	.quality-select option {
		background: #fff;
		color: #333;
		font-weight: 500;
		padding: 4px 8px;
	}

	:global(.dark) .quality-select {
		background: linear-gradient(
			135deg,
			oklch(0.65 0.15 var(--hue) / 0.15),
			oklch(0.65 0.15 var(--hue) / 0.05)
		);
		color: oklch(0.8 0.12 var(--hue));
		border-color: oklch(0.65 0.15 var(--hue) / 0.25);
	}
	:global(.dark) .quality-select:hover {
		background: linear-gradient(
			135deg,
			oklch(0.65 0.15 var(--hue) / 0.25),
			oklch(0.65 0.15 var(--hue) / 0.1)
		);
		border-color: oklch(0.65 0.15 var(--hue) / 0.45);
	}
	:global(.dark) .quality-select option {
		background: #2a2a2a;
		color: #e0e0e0;
	}

	.quality-arrow {
		position: absolute;
		right: 7px;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		pointer-events: none;
		color: oklch(0.55 0.12 var(--hue));
		transition: color 0.2s ease;
	}
	:global(.dark) .quality-arrow {
		color: oklch(0.75 0.12 var(--hue));
	}
</style>
