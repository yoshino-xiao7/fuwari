/**
 * types.ts — 音乐播放器共享类型定义
 */

export interface Song {
	id: number | string;
	name: string;
	artist: string;
	cover: string;
	url?: string;
}

export interface LyricLine {
	time: number;
	text: string;
}

export type QualityLevel =
	| "standard"
	| "higher"
	| "exhigh"
	| "lossless"
	| "hires";

/** MusicSearch.astro CustomEvent detail 结构 */
export interface MusicEventDetail {
	id: number | string;
	name: string;
	artist: string;
	cover: string;
}
