import { getImage } from "astro:assets";
import { siteConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import rss from "@astrojs/rss";
import type { RSSFeedItem } from "@astrojs/rss";
import type { APIContext, ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import { parse as htmlParser } from "node-html-parser";
import sanitizeHtml from "sanitize-html";

const markdownParser = new MarkdownIt();

/**
 * RSS 走的是 markdown-it，而非站点的 remark/rehype 管线，
 * 因此自定义指令不会被渲染，会以 `::github{repo="..."}` 原文泄漏到订阅源里。
 * 这里把已知指令降级为可读的等价 HTML。
 */
function renderDirectives(html: string): string {
	return html
		.replace(
			/::github\{repo=(?:&quot;|"|')([^"'&]+)(?:&quot;|"|')\}/g,
			(_m, repo) =>
				`<p><a href="https://github.com/${repo}">github.com/${repo}</a></p>`,
		)
		.replace(
			/::(note|tip|important|caution|warning)(?:\[([^\]]*)\])?/g,
			(_m, kind, label) =>
				`<p><strong>${String(label || kind).toUpperCase()}</strong></p>`,
		);
}

// get dynamic import of images as a map collection
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
	"/src/content/**/*.{jpeg,jpg,png,gif,webp}", // include posts and assets
);

export async function GET(context: APIContext): Promise<Response> {
	if (!context.site) {
		throw Error("site not set");
	}

	// Use the same ordering as site listing (pinned first, then by published desc)
	const posts = await getSortedPosts();
	const feed: RSSFeedItem[] = [];

	for (const post of posts) {
		// convert markdown to html string
		const body = markdownParser.render(post.body);
		// convert html string to DOM-like structure
		const html = htmlParser.parse(body);
		// hold all img tags in variable images
		const images = html.querySelectorAll("img");

		for (const img of images) {
			const src = img.getAttribute("src");
			if (!src) continue;

			// Handle content-relative images and convert them to built _astro paths
			if (src.startsWith("./") || src.startsWith("../")) {
				let importPath: string | null = null;

				if (src.startsWith("./")) {
					// Path relative to the post file directory
					const prefixRemoved = src.slice(2);
					importPath = `/src/content/posts/${prefixRemoved}`;
				} else {
					// Path like ../assets/images/xxx -> relative to /src/content/
					const cleaned = src.replace(/^\.\.\//, "");
					importPath = `/src/content/${cleaned}`;
				}

				const imageMod = await imagesGlob[importPath]?.()?.then(
					(res) => res.default,
				);
				if (imageMod) {
					// 保持默认调用：这里只是把正文图指向已存在的构建产物。
					// 指定 format/width 会让 Astro 额外生成一套 RSS 专用衍生图，
					// 而原图依旧会被发射，反而让 dist 变大（实测 +44MB）。
					const optimizedImg = await getImage({ src: imageMod });
					img.setAttribute("src", new URL(optimizedImg.src, context.site).href);
				}
			} else if (src.startsWith("/")) {
				// images starting with `/` are in public dir
				img.setAttribute("src", new URL(src, context.site).href);
			}
		}

		feed.push({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.published,
			link: `/posts/${post.slug}/`,
			// sanitize the new html string with corrected image paths
			// 指令替换放在 sanitize 之后：否则新生成的 <a> 会被过滤规则剥离
			content: renderDirectives(
				sanitizeHtml(html.toString(), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
				}),
			),
		});
	}

	return rss({
		title: siteConfig.title,
		description:
			siteConfig.description || siteConfig.subtitle || "No description",
		site: context.site,
		items: feed,
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		customData: [
			// RSS 2.0 要求 IANA 语言标签（zh-CN），而 siteConfig.lang 用的是 zh_CN
			`<language>${siteConfig.lang.replace("_", "-")}</language>`,
			`<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
			`<atom:link href="${new URL("rss.xml", context.site).href}" rel="self" type="application/rss+xml"/>`,
		].join(""),
	});
}
