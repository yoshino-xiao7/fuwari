/**
 * fancybox-init — Fancybox 图片灯箱初始化
 * 与 Swup 生命周期同步：页面切换时解绑，新内容加载时重新绑定
 */
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

const fancyboxOptions: Record<string, unknown> = {
	wheel: "zoom" as const,
	clickContent: "close" as const,
	dblclickContent: "zoom" as const,
	click: "close" as const,
	dblclick: "zoom" as const,
	Panels: {
		display: ["counter", "zoom"] as const,
	},
	Images: {
		panning: true,
		zoom: true,
		protect: false,
	},
};

const SELECTOR = ".custom-md img, #post-cover img";

export function setupFancybox(): void {
	Fancybox.bind(SELECTOR, fancyboxOptions);

	window.swup.hooks.on("page:view", () => {
		Fancybox.bind(SELECTOR, fancyboxOptions);
	});

	window.swup.hooks.on(
		"content:replace",
		() => {
			Fancybox.unbind(SELECTOR);
		},
		{ before: true },
	);
}
