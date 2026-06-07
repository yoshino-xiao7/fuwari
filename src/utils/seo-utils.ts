import path from "node:path";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

const contentImages = import.meta.glob<{ default: ImageMetadata }>(
	"/src/**/*.{jpeg,jpg,png,gif,webp,avif}",
);

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
	const optimized = await getImage({ src: image });
	return getAbsoluteUrl(optimized.src, site);
}

export function jsonLdString(data: unknown): string {
	return JSON.stringify(data, (_key, value) =>
		value === undefined ? undefined : value,
	);
}
