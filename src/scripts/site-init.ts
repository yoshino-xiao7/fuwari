/**
 * site-init — 站点初始化
 * 负责：主题加载、色相恢复、自定义滚动条、banner 展示、浮出面板点击外部关闭
 */
import { siteConfig } from "../config";
import { getHue, setHue } from "../utils/setting-utils";
import { setupClickOutsideToClose } from "./panel-manager";
import { initCustomScrollbar } from "./scrollbar";
import { getThemeMode, setThemeMode } from "./theme-manager";

function loadTheme() {
	setThemeMode(getThemeMode());
}

function loadHue() {
	setHue(getHue());
}

function showBanner() {
	if (!siteConfig.banner.enable) return;
	const banner = document.getElementById("banner");
	if (!banner) {
		console.error("Banner element not found");
		return;
	}
	banner.classList.remove("opacity-0", "scale-105");
}

export function initSite(): void {
	loadTheme();
	loadHue();
	initCustomScrollbar();
	showBanner();

	setupClickOutsideToClose("display-setting", [
		"display-setting",
		"display-settings-switch",
	]);
	setupClickOutsideToClose("nav-menu-panel", [
		"nav-menu-panel",
		"nav-menu-switch",
	]);
	setupClickOutsideToClose("search-panel", [
		"search-panel",
		"search-bar",
		"search-switch",
	]);
}
