import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkSectionize from "remark-sectionize";
import { imageFallbackConfig, siteConfig } from "./src/config.ts";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import rehypeImageFallback from "./src/plugins/rehype-image-fallback.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

const SITE_ORIGIN = "https://blog.yukiryou.icu";

/** 去掉站点前缀与首尾斜杠，得到稳定的比较键。 */
function normalizePath(url) {
	return url.replace(SITE_ORIGIN, "").replace(/^\/+|\/+$/g, "");
}

/**
 * 从 frontmatter 读取每篇内容的最后修改时间，供 sitemap 输出 <lastmod>。
 * 优先 updated，回退到 published。@astrojs/sitemap 无法访问 content
 * collections，因此这里直接读文件系统。
 */
function collectLastmod() {
	const map = new Map();
	for (const [dir, prefix] of [
		["src/content/posts", "posts"],
		["src/content/devlogs", "devlogs"],
	]) {
		let files = [];
		try {
			files = readdirSync(dir).filter((f) => f.endsWith(".md"));
		} catch {
			continue;
		}
		for (const file of files) {
			const raw = readFileSync(join(dir, file), "utf8");
			const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			if (!fm) continue;
			const pick = (key) =>
				fm[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
			const stamp = pick("updated") || pick("published");
			if (!stamp) continue;
			const date = new Date(stamp.replace(/^["']|["']$/g, ""));
			if (Number.isNaN(date.getTime())) continue;
			// slug 规则与 Astro 一致：去扩展名，空格转连字符，点号直接删除
			const slug = file
				.replace(/\.md$/, "")
				.replace(/\s+/g, "-")
				.replace(/\./g, "")
				.replace(/-+/g, "-")
				.toLowerCase();
			map.set(`${prefix}/${slug}`, date.toISOString());
		}
	}
	return map;
}

const contentLastmod = collectLastmod();

// https://astro.build/config
export default defineConfig({
	site: SITE_ORIGIN,
	base: "/",
	trailingSlash: "always",
	output: "static",
	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
				"simple-icons": ["*"],
			},
		}),
		svelte(),
		sitemap({
			// 根级分页页（/2/、/3/…）与首页内容高度重复，不应进入索引；
			// 不能只检查 URL 尾部，以免误伤未来的 /posts/123/ 一类文章。
			filter: (page) => !/^\/\d+\/$/.test(new URL(page).pathname),
			serialize(item) {
				const lastmod = contentLastmod.get(normalizePath(item.url));
				if (lastmod) {
					item.lastmod = lastmod;
				}
				if (item.url === "https://blog.yukiryou.icu/") {
					item.changefreq = "daily";
					item.priority = 1.0;
				} else if (item.url.includes("/posts/")) {
					item.changefreq = "weekly";
					item.priority = 0.8;
				} else if (item.url.includes("/devlogs/")) {
					item.changefreq = "weekly";
					item.priority = 0.6;
				} else {
					item.changefreq = "monthly";
					item.priority = 0.5;
				}
				return item;
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				// pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.25rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeSlug,
			[rehypeImageFallback, imageFallbackConfig],
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeExternalLinks,
				{
					target: "_blank",
					rel: ["noopener", "noreferrer"],
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
