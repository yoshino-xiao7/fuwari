/**
 * site-init — 站点初始化
 * 负责：主题加载、色相恢复、自定义滚动条、banner 展示、浮出面板点击外部关闭
 */
import { siteConfig } from '../config';
import { getHue, getStoredTheme, setHue, setTheme } from "../utils/setting-utils";
import { initCustomScrollbar } from "./scrollbar";

/** 浮出面板：点击外部自动关闭 */
function setupClickOutsideToClose(panelId: string, triggerIds: string[]) {
	document.addEventListener("click", event => {
		const panelDom = document.getElementById(panelId);
		const tDom = event.target;
		if (!(tDom instanceof Node)) return;
		for (const ig of triggerIds) {
			const ie = document.getElementById(ig);
			if (ie == tDom || (ie?.contains(tDom))) {
				return;
			}
		}
		panelDom!.classList.add("float-panel-closed");
	});
}

function loadTheme() {
	setTheme(getStoredTheme());
}

function loadHue() {
	setHue(getHue());
}

function showBanner() {
	if (!siteConfig.banner.enable) return;
	const banner = document.getElementById('banner');
	if (!banner) {
		console.error('Banner element not found');
		return;
	}
	banner.classList.remove('opacity-0', 'scale-105');
}

export function initSite() {
	loadTheme();
	loadHue();
	initCustomScrollbar();
	showBanner();

	setupClickOutsideToClose("display-setting", ["display-setting", "display-settings-switch"]);
	setupClickOutsideToClose("nav-menu-panel", ["nav-menu-panel", "nav-menu-switch"]);
	setupClickOutsideToClose("search-panel", ["search-panel", "search-bar", "search-switch"]);
}
