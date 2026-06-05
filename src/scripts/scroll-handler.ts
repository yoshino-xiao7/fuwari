/**
 * scroll-handler — 滚动和窗口大小事件处理
 * 负责：回到顶部按钮、TOC 显隐、navbar 显隐、banner 高度重算
 */
import {
	BANNER_HEIGHT,
	BANNER_HEIGHT_EXTEND,
	BANNER_HEIGHT_HOME,
	MAIN_PANEL_OVERLAPS_BANNER_HEIGHT,
} from "../constants/constants";

export function setupScrollHandler(): void {
	const bannerEnabled = !!document.getElementById("banner-wrapper");
	const backToTopBtn = document.getElementById("back-to-top-btn");
	const toc = document.getElementById("toc-wrapper");
	const navbar = document.getElementById("navbar-wrapper");

	function updateReadingProgress() {
		const progress = document.getElementById("reading-progress");
		const article = document.querySelector<HTMLElement>(".markdown-content");
		if (!progress || !article) {
			progress?.classList.add("opacity-0");
			document.documentElement.style.setProperty("--reading-progress", "0");
			return;
		}

		const scrollTop =
			window.scrollY ||
			document.documentElement.scrollTop ||
			document.body.scrollTop ||
			0;
		const articleTop = article.getBoundingClientRect().top + scrollTop;
		const articleHeight = article.scrollHeight;
		const start = articleTop - 96;
		const end = articleTop + articleHeight - window.innerHeight * 0.72;
		const range = Math.max(end - start, 1);
		const value = Math.min(Math.max((scrollTop - start) / range, 0), 1);

		progress.classList.toggle("opacity-0", value <= 0);
		document.documentElement.style.setProperty(
			"--reading-progress",
			value.toFixed(4),
		);
	}

	function onScroll() {
		updateReadingProgress();

		const bannerHeightPx = window.innerHeight * (BANNER_HEIGHT / 100);

		// Back to top button
		if (backToTopBtn) {
			if (
				document.body.scrollTop > bannerHeightPx ||
				document.documentElement.scrollTop > bannerHeightPx
			) {
				backToTopBtn.classList.remove("hide");
			} else {
				backToTopBtn.classList.add("hide");
			}
		}

		// TOC visibility
		if (bannerEnabled && toc) {
			if (
				document.body.scrollTop > bannerHeightPx ||
				document.documentElement.scrollTop > bannerHeightPx
			) {
				toc.classList.remove("toc-hide");
			} else {
				toc.classList.add("toc-hide");
			}
		}

		// Navbar visibility (only when banner is enabled)
		if (!bannerEnabled || !navbar) return;

		const NAVBAR_HEIGHT = 72;
		const MAIN_PANEL_EXCESS_HEIGHT = MAIN_PANEL_OVERLAPS_BANNER_HEIGHT * 16;

		let effectiveBannerHeight = BANNER_HEIGHT;
		if (
			document.body.classList.contains("lg:is-home") &&
			window.innerWidth >= 1024
		) {
			effectiveBannerHeight = BANNER_HEIGHT_HOME;
		}
		const threshold =
			window.innerHeight * (effectiveBannerHeight / 100) -
			NAVBAR_HEIGHT -
			MAIN_PANEL_EXCESS_HEIGHT -
			16;

		if (
			document.body.scrollTop >= threshold ||
			document.documentElement.scrollTop >= threshold
		) {
			navbar.classList.add("navbar-hidden");
		} else {
			navbar.classList.remove("navbar-hidden");
		}
	}

	window.onscroll = onScroll;

	window.onresize = () => {
		// Recalculate --banner-height-extend (must be multiple of 4 to avoid blurry text)
		let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
		offset = offset - (offset % 4);
		document.documentElement.style.setProperty(
			"--banner-height-extend",
			`${offset}px`,
		);
		onScroll();
	};

	onScroll();
	document.addEventListener("astro:page-load", onScroll);
	if (window?.swup?.hooks) {
		window.swup.hooks.on("content:replace", () =>
			requestAnimationFrame(onScroll),
		);
	} else {
		document.addEventListener("swup:enable", () => {
			window.swup?.hooks?.on("content:replace", () =>
				requestAnimationFrame(onScroll),
			);
		});
	}
}
