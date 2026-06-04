/**
 * music-store.svelte.ts — Svelte 5 runes 驱动的播放器状态管理
 *
 * 单例 store，供 MusicPlayer.svelte / DynamicIsland.svelte 及所有子组件共享。
 * 替代原 GlobalMusicPlayer.astro 中的 TypeScript class + DOM 操作模式。
 */

import type { LyricLine, MusicEventDetail, QualityLevel, Song } from "./types";

// ===== API =====

const isLocalhost =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1");

const MUSIC_API = isLocalhost
	? "http://localhost:9898/blog/music"
	: "https://api.yukiryou.icu/blog/music";

// ===== Store =====

class MusicStore {
	// ---- Reactive state (Svelte 5 runes) ----
	playlist: Song[] = $state([]);
	currentIndex: number = $state(-1);
	isPlaying: boolean = $state(false);
	volume: number = $state(0.8);
	quality: QualityLevel = $state("exhigh");
	currentTime: number = $state(0);
	duration: number = $state(0);
	isExpanded: boolean = $state(false);
	showPlaylist: boolean = $state(false);

	// ---- Non-reactive internal state ----
	lyrics: LyricLine[] = [];
	currentLyricIndex = -1;

	// ---- Internal audio element ----
	private audio: HTMLAudioElement;
	private pauseTimer: ReturnType<typeof setTimeout> | null = null;
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
		}
	}

	// ===== Computed getters =====

	get currentSong(): Song | null {
		if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length)
			return null;
		return this.playlist[this.currentIndex];
	}

	get isMuted(): boolean {
		return this.audio?.muted || this.volume === 0;
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

	// ===== Initialization =====

	init() {
		if (this.initialized) return;
		this.initialized = true;

		// Create audio element now (guaranteed browser context)
		if (!this.audio) {
			this.audio = new Audio();
			this.audio.preload = "metadata";
			this.audio.volume = this.volume;
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
		this.audio.addEventListener("ended", () => {
			this.next();
		});
		this.audio.addEventListener("play", () => {
			this.isPlaying = true;
		});
		this.audio.addEventListener("pause", () => {
			this.isPlaying = false;
		});
		this.audio.addEventListener("error", () => {
			console.error("Audio load error");
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
			const savedQuality = localStorage.getItem(
				"music_quality",
			) as QualityLevel | null;

			if (savedPlaylist) this.playlist = JSON.parse(savedPlaylist);
			if (savedIndex) this.currentIndex = Number.parseInt(savedIndex, 10);
			if (savedVolume) {
				this.volume = Number.parseFloat(savedVolume);
				this.audio.volume = this.volume;
			}
			if (savedQuality) this.quality = savedQuality;

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

			const handleError = () => {
				console.warn("HTTPS playback failed, falling back to HTTP");
				if (httpsUrl !== httpUrl) {
					this.audio.src = httpUrl;
					song.url = httpUrl;
					this.audio.play().catch(() => {
						console.error("HTTP playback also failed");
					});
				}
			};

			this.audio.addEventListener("error", handleError, { once: true });
			await this.audio.play().catch(() => {
				// play() failure will trigger the error handler above
			});

			this.persistState();
		} catch (e) {
			console.error("Playback failed", e);
		}
	}

	togglePlay() {
		if (!this.audio) return;
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
		this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
		this.playCurrent();
	}

	prev() {
		if (this.playlist.length === 0) return;
		this.currentIndex =
			(this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
		this.playCurrent();
	}

	seek(percent: number) {
		if (!this.audio?.duration) return;
		this.audio.currentTime = (percent / 100) * this.audio.duration;
	}

	seekTo(time: number) {
		if (!this.audio) return;
		this.audio.currentTime = time;
	}

	// ===== Playlist =====

	addSong(song: Song, autoPlay = true) {
		const existingIndex = this.playlist.findIndex((s) => s.id === song.id);
		if (existingIndex === -1) {
			this.playlist = [...this.playlist, song];
			this.persistState();
			if (autoPlay) {
				this.currentIndex = this.playlist.length - 1;
				this.playCurrent();
			}
		} else if (autoPlay) {
			this.currentIndex = existingIndex;
			this.playCurrent();
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
		this.currentIndex = index;
		this.playCurrent();
	}

	// ===== Volume =====

	setVolume(v: number) {
		this.volume = v;
		if (this.audio) {
			this.audio.volume = v;
			if (v > 0 && this.audio.muted) {
				this.audio.muted = false;
			}
		}
		this.persistState();
	}

	toggleMute() {
		if (!this.audio) return;
		this.audio.muted = !this.audio.muted;
	}

	// ===== Quality =====

	setQuality(q: QualityLevel) {
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

	// ===== UI =====

	toggleExpanded() {
		this.isExpanded = !this.isExpanded;
		if (this.isExpanded) {
			this.showPlaylist = false;
		}
	}

	closeExpanded() {
		this.isExpanded = false;
	}

	togglePlaylist() {
		this.showPlaylist = !this.showPlaylist;
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

	// ===== Persistence =====

	persistState() {
		try {
			localStorage.setItem("music_playlist", JSON.stringify(this.playlist));
			localStorage.setItem("music_current_index", String(this.currentIndex));
			localStorage.setItem("music_volume", String(this.volume));
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

// ===== Singleton export =====

export const musicStore = new MusicStore();
