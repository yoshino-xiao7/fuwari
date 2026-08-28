import path from "node:path";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

const contentImages = import.meta.glob<{ default: ImageMetadata }>(
	"/src/**/*.{jpeg,jpg,png,gif,webp,avif}",
);

/** 社交卡片推荐尺寸（1.91:1），summary_large_image 与 OG 通用。 */
export const OG_IMAGE_WIDTH: number = 1200;
export const OG_IMAGE_HEIGHT: number = 630;

function toSite(site: URL | string | undefined): URL {
	return new URL(
		site?.toString() || import.meta.env.SITE || "http://localhost/",
	);
}

export function getCanonicalUrl(
	pathname: string,
	site: URL | string | undefined,
): string {
	return new URL(pathname, toSite(site)).href;
}

export function getAbsoluteUrl(
	value: string,
	site: URL | string | undefined,
): string {
	if (/^https?:\/\//i.test(value)) {
		return value;
	}
	return new URL(value, toSite(site)).href;
}

export async function resolveImageUrl(
	src: string | undefined,
	site: URL | string | undefined,
	basePath = "",
): Promise<string | undefined> {
	if (!src || src.startsWith("data:")) {
		return undefined;
	}

	if (/^https?:\/\//i.test(src) || src.startsWith("/")) {
		return getAbsoluteUrl(src, site);
	}

	const importPath = path.posix
		.normalize(`/src/${basePath}/${src}`)
		.replace(/\/+/g, "/");
	const loader = contentImages[importPath];

	if (!loader) {
		console.warn(`[seo] Image file not found for metadata: ${importPath}`);
		return undefined;
	}

	const image = (await loader()).default;
	// 必须显式指定 format/width：省略时 Astro 会沿用原格式与原始尺寸，
	// 把未经压缩的封面原图额外产出到 dist/_astro/，而社交卡片根本用不到它
	// （实测产生 38MB 无人引用的死重）。
	// 选 jpeg 而非 webp：部分社交平台爬虫对 webp OG 图的支持仍不完整。
	const optimized = await getImage({
		src: image,
		format: "jpeg",
		width: OG_IMAGE_WIDTH,
		height: OG_IMAGE_HEIGHT,
		fit: "cover",
		quality: 82,
	});
	return getAbsoluteUrl(optimized.src, site);
}

export function jsonLdString(data: unknown): string {
	return (
		JSON.stringify(data, (_key, value) =>
			value === undefined ? undefined : value,
		)
			// 防止正文中的 `</script>` 提前闭合 JSON-LD 脚本标签
			.replace(/<\/script>/gi, "<\\/script>")
	);
}
