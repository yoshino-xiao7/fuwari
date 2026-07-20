/**
 * fancybox-init — Fancybox 图片灯箱初始化
 * 与 Swup 生命周期同步：页面切换时解绑，新内容加载时重新绑定
 */
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
let fancybox: typeof import("@fancyapps/ui").Fancybox | null = null;
let loadPromise: Promise<typeof import("@fancyapps/ui").Fancybox> | null = null;
let hooksRegistered = false;

async function loadFancybox() {
	if (fancybox) return fancybox;
	if (!loadPromise) {
		loadPromise = Promise.all([
			import("@fancyapps/ui"),
			import("@fancyapps/ui/dist/fancybox/fancybox.css"),
		]).then(([module]) => {
			fancybox = module.Fancybox;
			return fancybox;
		});
	}
	return loadPromise;
}

async function bindFancybox() {
	if (!document.querySelector(SELECTOR)) return;
	const instance = await loadFancybox();
	instance.bind(SELECTOR, fancyboxOptions);
}

export function setupFancybox(): void {
	void bindFancybox();
	if (hooksRegistered) return;
	hooksRegistered = true;

	window.swup.hooks.on("page:view", () => {
		void bindFancybox();
	});

	window.swup.hooks.on(
		"content:replace",
		() => {
			fancybox?.unbind(SELECTOR);
		},
		{ before: true },
	);
}
