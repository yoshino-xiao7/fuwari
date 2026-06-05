/**
 * music-store.svelte.ts — Svelte 5 runes 驱动的播放器状态管理
 *
 * 单例 store，供 MusicPlayer.svelte / DynamicIsland.svelte 及所有子组件共享。
 * 替代原 GlobalMusicPlayer.astro 中的 TypeScript class + DOM 操作模式。
 */

import type {
	LyricLine,
	MusicEventDetail,
	PlayMode,
	QualityLevel,
	Song,
} from "./types";

// ===== API =====

const isLocalhost =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1");

const MUSIC_API = isLocalhost
	? "http://localhost:9898/blog/music"
	: "https://api.yukiryou.icu/blog/music";

const PAUSED_VISIBLE_MS = 5000;
const ERROR_VISIBLE_MS = 4500;
const TOAST_VISIBLE_MS = 2600;
const MAX_RECENT_SONGS = 20;

// ===== Store =====

class MusicStore {
	// ---- Reactive state (Svelte 5 runes) ----
	playlist: Song[] = $state([]);
	currentIndex: number = $state(-1);
	isPlaying: boolean = $state(false);
	volume: number = $state(0.8);
	quality: QualityLevel = $state("exhigh");
	playMode: PlayMode = $state("sequence");
	currentTime: number = $state(0);
	duration: number = $state(0);
	isExpanded: boolean = $state(false);
	showPlaylist: boolean = $state(false);
	showSearch: boolean = $state(false);
	isLoading: boolean = $state(false);
	errorMessage: string = $state("");
	isMuted: boolean = $state(false);
	toastMessage: string = $state("");
	toastVisibleUntil: number = $state(0);
	favoriteSongs: Song[] = $state([]);
	recentSongs: Song[] = $state([]);
	lastMusicInteractionAt: number = $state(0);
	pausedVisibleUntil: number = $state(0);

	// ---- Non-reactive internal state ----
	lyrics: LyricLine[] = $state([]);
	currentLyricIndex: number = $state(-1);

	// ---- Internal audio element ----
	private audio: HTMLAudioElement;
	private pauseTimer: ReturnType<typeof setTimeout> | null = null;
	private errorTimer: ReturnType<typeof setTimeout> | null = null;
	private toastTimer: ReturnType<typeof setTimeout> | null = null;
	private clockInterval: ReturnType<typeof setInterval> | null = null;
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private initialized = false;

	constructor() {
		// Defer Audio creation to browser — SSR has no HTMLAudioElement
		this.audio =
			typeof Audio !== "undefined"
				? new Audio()
				: (null as unknown as HTMLAudioElement);
		if (this.audio) {
			this.audio.preload = "metadata";
			this.audio.volume = this.volume;
			this.audio.muted = this.isMuted;
		}
	}

	// ===== Computed getters =====

	get currentSong(): Song | null {
		if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length)
			return null;
		return this.playlist[this.currentIndex];
	}

	get progressPercent(): number {
		return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
	}

	get coverUrl(): string {
		return this.currentSong?.cover
			? `${this.currentSong.cover}?param=120y120`
			: "";
	}

	get coverUrlSmall(): string {
		return this.currentSong?.cover
			? `${this.currentSong.cover}?param=40y40`
			: "";
	}

	get currentLyricText(): string {
		return this.lyrics[this.currentLyricIndex]?.text || "♪ 播放中";
	}

	get nextLyricText(): string {
		return this.lyrics[this.currentLyricIndex + 1]?.text || "";
	}

	get playModeLabel(): string {
		const labels: Record<PlayMode, string> = {
			sequence: "顺序播放",
			"repeat-one": "单曲循环",
			shuffle: "随机播放",
		};
		return labels[this.playMode];
	}

	get isPausedVisible(): boolean {
		return (
			this.currentSong !== null &&
			!this.isPlaying &&
			Date.now() < this.pausedVisibleUntil
		);
	}

	// ===== Initialization =====

	init() {
		if (this.initialized) return;
		this.initialized = true;

		// Create audio element now (guaranteed browser context)
		if (!this.audio) {
			this.audio = new Audio();
			this.audio.preload = "metadata";
			this.applyAudioVolume();
		}

		this.setupAudioEvents();
		this.loadPersistedState();
		this.setupCustomEvents();
	}

	private setupAudioEvents() {
		this.audio.addEventListener("timeupdate", () => {
			this.currentTime = this.audio.currentTime;
		});
		this.audio.addEventListener("loadedmetadata", () => {
			this.duration = this.audio.duration || 0;
		});
		this.audio.addEventListener("volumechange", () => {
			this.volume = clampVolume(this.audio.volume);
			this.isMuted = this.audio.muted || this.volume === 0;
		});
		this.audio.addEventListener("ended", () => {
			this.handleEnded();
		});
		this.audio.addEventListener("play", () => {
			this.isLoading = false;
			this.errorMessage = "";
			this.isPlaying = true;
			this.markMusicInteraction();
		});
		this.audio.addEventListener("pause", () => {
			this.isPlaying = false;
			if (this.currentSong && !this.isLoading) {
				this.showPausedBriefly();
			}
		});
		this.audio.addEventListener("error", () => {
			console.error("Audio load error");
			this.isLoading = false;
			this.setError("播放失败，已尝试切换歌曲");
			if (this.playlist.length > 1) {
				this.next();
			}
		});
	}

	private loadPersistedState() {
		try {
			const savedPlaylist = localStorage.getItem("music_playlist");
			const savedIndex = localStorage.getItem("music_current_index");
			const savedVolume = localStorage.getItem("music_volume");
			const savedMuted = localStorage.getItem("music_muted");
			const savedPlayMode = localStorage.getItem(
				"music_play_mode",
			) as PlayMode | null;
			const savedFavorites = localStorage.getItem("music_favorites");
			const savedRecentSongs = localStorage.getItem("music_recent_songs");
			const savedQuality = localStorage.getItem(
				"music_quality",
			) as QualityLevel | null;

			if (savedPlaylist) this.playlist = JSON.parse(savedPlaylist);
			if (savedIndex) this.currentIndex = Number.parseInt(savedIndex, 10);
			if (savedVolume) {
				this.volume = clampVolume(Number.parseFloat(savedVolume));
			}
			if (savedMuted) this.isMuted = savedMuted === "true";
			this.applyAudioVolume();
			if (savedQuality) this.quality = savedQuality;
			if (savedPlayMode && isPlayMode(savedPlayMode)) {
				this.playMode = savedPlayMode;
			}
			if (savedFavorites) this.favoriteSongs = parseSongs(savedFavorites);
			if (savedRecentSongs) {
				this.recentSongs = parseSongs(savedRecentSongs).slice(
					0,
					MAX_RECENT_SONGS,
				);
			}

			// Clean up legacy keys
			localStorage.removeItem("music_is_minimized");
			localStorage.removeItem("music_is_collapsed");
		} catch (e) {
			console.error("Failed to load player state", e);
		}
	}

	private setupCustomEvents() {
		// Listen for music:play and music:add from MusicSearch.astro
		window.addEventListener("music:play", ((
			e: CustomEvent<MusicEventDetail>,
		) => {
			this.addSong(e.detail, true);
		}) as EventListener);

		window.addEventListener("music:add", ((
			e: CustomEvent<MusicEventDetail>,
		) => {
			this.addSong(e.detail, true);
		}) as EventListener);
	}

	// ===== Playback =====

	async playCurrent() {
		if (!this.audio) return;
		const song = this.currentSong;
		if (!song) return;

		try {
			this.markMusicInteraction();
			this.isLoading = true;
			this.errorMessage = "";
			const res = await fetch(
				`${MUSIC_API}/url?id=${song.id}&level=${this.quality}`,
			);
			if (!res.ok) throw new Error("Failed to get playback URL");

			const json = await res.json();
			const url: string | undefined = json.data?.[0]?.url;
			if (!url) throw new Error("No playback URL available");

			// Prefer HTTPS (mixed content), fallback to HTTP
			const httpsUrl = url.replace(/^http:\/\//, "https://");
			const httpUrl = url;

			song.url = httpsUrl;
			this.audio.src = httpsUrl;
			this.applyAudioVolume();
			this.addRecentSong(song);

			const handleError = () => {
				console.warn("HTTPS playback failed, falling back to HTTP");
				if (httpsUrl !== httpUrl) {
					this.audio.src = httpUrl;
					song.url = httpUrl;
					this.applyAudioVolume();
					this.audio.play().catch(() => {
						console.error("HTTP playback also failed");
					});
				}
			};

			this.audio.addEventListener("error", handleError, { once: true });
			await this.audio.play().catch(() => {
				// play() failure will trigger the error handler above
			});
			this.isLoading = false;

			this.persistState();
		} catch (e) {
			console.error("Playback failed", e);
			this.isLoading = false;
			this.setError("播放失败，请稍后再试");
		}
	}

	togglePlay() {
		if (!this.audio) return;
		this.markMusicInteraction();
		if (this.isPlaying) {
			this.audio.pause();
		} else {
			if (this.currentIndex === -1 && this.playlist.length > 0) {
				this.currentIndex = 0;
				this.playCurrent();
			} else if (this.audio.src) {
				this.audio.play().catch(() => {});
			} else if (this.currentIndex >= 0) {
				this.playCurrent();
			}
		}
	}

	next() {
		if (this.playlist.length === 0) return;
		this.markMusicInteraction();
		this.currentIndex = this.getNextIndex();
		this.playCurrent();
	}

	prev() {
		if (this.playlist.length === 0) return;
		this.markMusicInteraction();
		this.currentIndex =
			(this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
		this.playCurrent();
	}

	seek(percent: number) {
		if (!this.audio?.duration) return;
		this.markMusicInteraction();
		this.audio.currentTime = (percent / 100) * this.audio.duration;
	}

	seekTo(time: number) {
		if (!this.audio) return;
		this.markMusicInteraction();
		this.audio.currentTime = time;
	}

	// ===== Playlist =====

	addSong(song: Song, autoPlay = true) {
		this.markMusicInteraction();
		const existingIndex = this.playlist.findIndex((s) => s.id === song.id);
		if (existingIndex === -1) {
			this.playlist = [...this.playlist, song];
			this.persistState();
			if (!autoPlay) this.showToast("已加入播放列表");
			if (autoPlay) {
				this.currentIndex = this.playlist.length - 1;
				this.playCurrent();
			}
		} else if (autoPlay) {
			this.currentIndex = existingIndex;
			this.playCurrent();
		} else {
			this.showToast("播放列表中已有这首歌");
		}
	}

	removeSong(index: number) {
		if (index === this.currentIndex) {
			this.audio?.pause();
			if (this.playlist.length > 1) {
				const newPlaylist = [...this.playlist];
				newPlaylist.splice(index, 1);
				this.playlist = newPlaylist;
				this.currentIndex = Math.min(index, this.playlist.length - 1);
				this.playCurrent();
			} else {
				this.playlist = [];
				this.currentIndex = -1;
				if (this.audio) this.audio.src = "";
			}
		} else {
			const newPlaylist = [...this.playlist];
			newPlaylist.splice(index, 1);
			this.playlist = newPlaylist;
			if (index < this.currentIndex) {
				this.currentIndex--;
			}
		}
		this.persistState();
	}

	playAtIndex(index: number) {
		if (index < 0 || index >= this.playlist.length) return;
		this.markMusicInteraction();
		this.currentIndex = index;
		this.playCurrent();
	}

	playSong(song: Song) {
		this.addSong(song, true);
	}

	addRecentSong(song: Song) {
		const next = [
			stripTransientSongUrl(song),
			...this.recentSongs.filter((s) => s.id !== song.id),
		].slice(0, MAX_RECENT_SONGS);
		this.recentSongs = next;
		this.persistState();
	}

	clearRecentSongs() {
		this.recentSongs = [];
		this.persistState();
		this.showToast("已清空最近播放");
	}

	toggleFavorite(song = this.currentSong) {
		if (!song) return;
		this.markMusicInteraction();
		if (this.isFavorite(song.id)) {
			this.favoriteSongs = this.favoriteSongs.filter((s) => s.id !== song.id);
			this.showToast("已取消收藏");
		} else {
			this.favoriteSongs = [
				stripTransientSongUrl(song),
				...this.favoriteSongs.filter((s) => s.id !== song.id),
			];
			this.showToast("已收藏");
		}
		this.persistState();
	}

	isFavorite(songId: number | string | undefined): boolean {
		if (songId === undefined) return false;
		return this.favoriteSongs.some((song) => song.id === songId);
	}

	// ===== Volume =====

	setVolume(v: number) {
		this.markMusicInteraction();
		this.volume = clampVolume(v);
		this.isMuted = this.volume === 0;
		this.applyAudioVolume();
		this.persistState();
	}

	toggleMute() {
		if (!this.audio) return;
		this.markMusicInteraction();
		this.isMuted = !this.isMuted;
		this.applyAudioVolume();
		this.persistState();
	}

	private applyAudioVolume() {
		if (!this.audio) return;
		const nextVolume = clampVolume(this.volume);
		this.audio.muted = this.isMuted || nextVolume === 0;
		this.audio.volume = nextVolume;
	}

	// ===== Quality =====

	setQuality(q: QualityLevel) {
		this.markMusicInteraction();
		this.quality = q;
		localStorage.setItem("music_quality", q);
		// Reload current song with new quality
		if (this.currentIndex >= 0 && this.audio) {
			const currentTime = this.audio.currentTime;
			const wasPlaying = this.isPlaying;
			this.playCurrent().then(() => {
				if (this.audio && currentTime > 0) {
					this.audio.currentTime = currentTime;
				}
				if (!wasPlaying && this.audio) {
					this.audio.pause();
				}
			});
		}
	}

	cyclePlayMode() {
		this.markMusicInteraction();
		const nextMode: Record<PlayMode, PlayMode> = {
			sequence: "repeat-one",
			"repeat-one": "shuffle",
			shuffle: "sequence",
		};
		this.playMode = nextMode[this.playMode];
		localStorage.setItem("music_play_mode", this.playMode);
		this.showToast(this.playModeLabel);
	}

	// ===== UI =====

	toggleExpanded() {
		this.markMusicInteraction();
		this.isExpanded = !this.isExpanded;
		if (this.isExpanded) {
			this.showPlaylist = false;
			this.showSearch = false;
		}
	}

	closeExpanded() {
		this.isExpanded = false;
	}

	togglePlaylist() {
		this.markMusicInteraction();
		this.showPlaylist = !this.showPlaylist;
		if (this.showPlaylist) this.showSearch = false;
	}

	toggleSearch() {
		this.markMusicInteraction();
		this.showSearch = !this.showSearch;
		if (this.showSearch) this.showPlaylist = false;
	}

	// ===== Island visibility hints =====

	markMusicInteraction() {
		this.lastMusicInteractionAt = Date.now();
	}

	showPausedBriefly(duration = PAUSED_VISIBLE_MS) {
		this.markMusicInteraction();
		this.pausedVisibleUntil = Date.now() + duration;
		if (this.pauseTimer) clearTimeout(this.pauseTimer);
		this.pauseTimer = setTimeout(() => {
			this.pausedVisibleUntil = 0;
		}, duration);
	}

	private setError(message: string) {
		this.errorMessage = message;
		this.pausedVisibleUntil = 0;
		if (this.errorTimer) clearTimeout(this.errorTimer);
		this.errorTimer = setTimeout(() => {
			this.errorMessage = "";
		}, ERROR_VISIBLE_MS);
	}

	showToast(message: string, duration = TOAST_VISIBLE_MS) {
		this.toastMessage = message;
		this.toastVisibleUntil = Date.now() + duration;
		if (this.toastTimer) clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => {
			this.toastVisibleUntil = 0;
			this.toastMessage = "";
		}, duration);
	}

	// ===== Lyrics =====

	async fetchLyrics(songId: number | string) {
		this.lyrics = [];
		this.currentLyricIndex = -1;
		try {
			const res = await fetch(`${MUSIC_API}/lyric?id=${songId}`);
			const data = await res.json();
			if (data.code === 200 && data.data?.lrc?.lyric) {
				this.lyrics = parseLRC(data.data.lrc.lyric);
			}
		} catch (_e) {
			// silently ignore
		}
	}

	updateLyric(time: number): string {
		if (this.lyrics.length === 0) return "♪ 播放中";
		let idx = -1;
		for (let i = this.lyrics.length - 1; i >= 0; i--) {
			if (time >= this.lyrics[i].time) {
				idx = i;
				break;
			}
		}
		if (idx !== this.currentLyricIndex && idx >= 0) {
			this.currentLyricIndex = idx;
		}
		return this.lyrics[this.currentLyricIndex]?.text || "♪";
	}

	// ===== Playback mode helpers =====

	private handleEnded() {
		if (this.playMode === "repeat-one") {
			this.markMusicInteraction();
			this.audio.currentTime = 0;
			this.audio.play().catch(() => {
				this.playCurrent();
			});
			return;
		}
		this.next();
	}

	private getNextIndex(): number {
		if (this.playlist.length <= 1) return 0;
		if (this.playMode !== "shuffle") {
			return (this.currentIndex + 1) % this.playlist.length;
		}

		let nextIndex = this.currentIndex;
		while (nextIndex === this.currentIndex) {
			nextIndex = Math.floor(Math.random() * this.playlist.length);
		}
		return nextIndex;
	}

	// ===== Persistence =====

	persistState() {
		try {
			localStorage.setItem("music_playlist", JSON.stringify(this.playlist));
			localStorage.setItem("music_current_index", String(this.currentIndex));
			localStorage.setItem("music_volume", String(this.volume));
			localStorage.setItem("music_muted", String(this.isMuted));
			localStorage.setItem("music_play_mode", this.playMode);
			localStorage.setItem(
				"music_favorites",
				JSON.stringify(this.favoriteSongs.map(stripTransientSongUrl)),
			);
			localStorage.setItem(
				"music_recent_songs",
				JSON.stringify(this.recentSongs.map(stripTransientSongUrl)),
			);
		} catch (e) {
			console.error("Failed to save player state", e);
		}
	}

	// ===== Formatting helpers =====

	formatTime(seconds: number): string {
		if (!seconds || Number.isNaN(seconds)) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	formatClock(): string {
		return new Date().toLocaleTimeString("zh-CN", {
			timeZone: "Asia/Shanghai",
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}

	// ===== Cleanup =====

	destroy() {
		this.audio?.pause();
		if (this.audio) this.audio.src = "";
		if (this.clockInterval) clearInterval(this.clockInterval);
		if (this.pollInterval) clearInterval(this.pollInterval);
		if (this.pauseTimer) clearTimeout(this.pauseTimer);
		if (this.errorTimer) clearTimeout(this.errorTimer);
		if (this.toastTimer) clearTimeout(this.toastTimer);
	}
}

// ===== LRC parser =====

function parseLRC(lrc: string): LyricLine[] {
	const result: LyricLine[] = [];
	for (const line of lrc.split("\n")) {
		const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
		if (m) {
			const t =
				Number.parseInt(m[1]) * 60 +
				Number.parseInt(m[2]) +
				Number.parseInt(m[3].padEnd(3, "0")) / 1000;
			const txt = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
			if (txt) result.push({ time: t, text: txt });
		}
	}
	return result.sort((a, b) => a.time - b.time);
}

function clampVolume(value: number): number {
	if (!Number.isFinite(value)) return 0.8;
	return Math.min(1, Math.max(0, value));
}

function isPlayMode(value: string): value is PlayMode {
	return value === "sequence" || value === "repeat-one" || value === "shuffle";
}

function parseSongs(value: string): Song[] {
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isSongLike).map(stripTransientSongUrl);
	} catch (_e) {
		return [];
	}
}

function isSongLike(value: unknown): value is Song {
	if (!value || typeof value !== "object") return false;
	const song = value as Partial<Song>;
	return (
		(typeof song.id === "number" || typeof song.id === "string") &&
		typeof song.name === "string" &&
		typeof song.artist === "string" &&
		typeof song.cover === "string"
	);
}

function stripTransientSongUrl(song: Song): Song {
	return {
		id: song.id,
		name: song.name,
		artist: song.artist,
		cover: song.cover,
	};
}

// ===== Singleton export =====

export const musicStore = new MusicStore();
