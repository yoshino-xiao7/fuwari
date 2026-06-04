/**
 * scrollbar — OverlayScrollbars 初始化
 * 被 site-init 和 swup-hooks 共同引用
 */
import { OverlayScrollbars } from "overlayscrollbars";

export function initCustomScrollbar() {
	const bodyElement = document.querySelector("body");
	if (!bodyElement) return;
	OverlayScrollbars(
		{
			target: bodyElement,
			cancel: {
				nativeScrollbarsOverlaid: true,
			},
		},
		{
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto py-1",
				autoHide: "move",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		},
	);

	const katexElements = document.querySelectorAll(
		".katex-display",
	) as NodeListOf<HTMLElement>;
	katexElements.forEach((ele) => {
		OverlayScrollbars(ele, {
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto py-1",
			},
		});
	});
}
