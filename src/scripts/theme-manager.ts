/**
 * theme-manager — 统一主题管理
 *
 * 三态主题循环：Classic Dark → Liquid Glass → Light
 * 使用单一 localStorage key ("theme-mode") 替代旧的 theme + style-mode 双 key 方案。
 * 自动迁移旧数据：读取旧 key → 转换为新格式 → 写入新 key → 清除旧 key。
 */

export type ThemeMode = "dark" | "glass" | "light";

const THEME_KEY = "theme-mode";

/** 从 localStorage 读取主题，含旧 key 自动迁移 */
export function getThemeMode(): ThemeMode {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === "dark" || stored === "glass" || stored === "light") {
		return stored;
	}
	// 尝试从旧 key 迁移
	const migrated = migrateLegacyTheme();
	if (migrated) {
		localStorage.setItem(THEME_KEY, migrated);
		localStorage.removeItem("theme");
		localStorage.removeItem("style-mode");
		return migrated;
	}
	// 默认：glass 模式（与原行为一致 —— ThemeInit 默认加 glass class）
	return "glass";
}

/** 设置主题模式 —— 同时更新 DOM class 和 localStorage */
export function setThemeMode(mode: ThemeMode): void {
	const root = document.documentElement;
	root.classList.toggle("dark", mode !== "light");
	root.classList.toggle("glass", mode === "glass");
	localStorage.setItem(THEME_KEY, mode);
}

/** 三态循环：dark → glass → light → dark */
export function cycleTheme(): void {
	const current = getThemeMode();
	const next: Record<ThemeMode, ThemeMode> = {
		dark: "glass",
		glass: "light",
		light: "dark",
	};
	setThemeMode(next[current]);
}

/** 旧 key 迁移：theme + style-mode → ThemeMode */
function migrateLegacyTheme(): ThemeMode | null {
	const oldTheme = localStorage.getItem("theme");
	const oldStyleMode = localStorage.getItem("style-mode");
	if (!oldTheme && !oldStyleMode) return null;

	if (oldStyleMode === "glass") return "glass";
	if (oldTheme === "light") return "light";
	// "dark"、"auto"、或任何未知值 → 默认 glass（保持原 glass-first 行为）
	return "glass";
}
