import { BANNER_HEIGHT } from "../constants/constants";
/**
 * swup-hooks — Swup 页面过渡钩子注册
 * 处理：导航延迟消除、banner 高度切换、page-height-extend、TOC 显隐、scrollbar 重建
 */
import { url, pathsEqual } from "../utils/url-utils";
import { initCustomScrollbar } from "./scrollbar";

export function setupSwupHooks(): void {
	const bannerEnabled = !!document.getElementById("banner-wrapper");

	window.swup.hooks.on("link:click", () => {
		// Remove the delay for the first time page load
		document.documentElement.style.setProperty("--content-delay", "0ms");

		// prevent elements from overlapping the navbar
		if (!bannerEnabled) return;

		const threshold = window.innerHeight * (BANNER_HEIGHT / 100) - 72 - 16;
		const navbar = document.getElementById("navbar-wrapper");
		if (!navbar || !document.body.classList.contains("lg:is-home")) return;

		if (
			document.body.scrollTop >= threshold ||
			document.documentElement.scrollTop >= threshold
		) {
			navbar.classList.add("navbar-hidden");
		}
	});

	window.swup.hooks.on("content:replace", initCustomScrollbar);

	window.swup.hooks.on("visit:start", (visit: { to: { url: string } }) => {
		// change banner height immediately when a link is clicked
		const bodyElement = document.querySelector("body");
		if (pathsEqual(visit.to.url, url("/"))) {
			bodyElement?.classList.add("lg:is-home");
		} else {
			bodyElement?.classList.remove("lg:is-home");
		}

		// increase the page height during page transition to prevent the scrolling animation from jumping
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) {
			heightExtend.classList.remove("hidden");
		}

		// Hide the TOC while scrolling back to top
		const toc = document.getElementById("toc-wrapper");
		if (toc) {
			toc.classList.add("toc-not-ready");
		}
	});

	window.swup.hooks.on("page:view", () => {
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) {
			heightExtend.classList.remove("hidden");
		}
	});

	window.swup.hooks.on("visit:end", () => {
		setTimeout(() => {
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.add("hidden");
			}

			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.remove("toc-not-ready");
			}
		}, 200);
	});
}
