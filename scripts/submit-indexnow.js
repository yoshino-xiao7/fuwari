import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const siteOrigin = "https://blog.yukiryou.icu";
const siteHost = new URL(siteOrigin).host;
const indexNowKey = "f931de378f1778fb9cce1ac20636bfe1";
const keyLocation = `${siteOrigin}/${indexNowKey}.txt`;
const sitemapPath = path.resolve("dist/sitemap-0.xml");
const submitAll = process.argv.includes("--all");
const dryRun = process.argv.includes("--dry-run");

function readSitemapUrls() {
	if (!fs.existsSync(sitemapPath)) {
		throw new Error(`找不到 ${sitemapPath}，请先运行 pnpm build`);
	}

	const sitemap = fs.readFileSync(sitemapPath, "utf8");
	return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
		.map((match) => match[1].replaceAll("&amp;", "&"))
		.filter((url) => new URL(url).host === siteHost);
}

function getDiffBase() {
	const eventBase = process.env.INDEXNOW_DIFF_BASE;
	if (eventBase && !/^0+$/.test(eventBase)) {
		return eventBase;
	}
	return "HEAD^";
}

function getChangedFiles() {
	try {
		const output = execFileSync(
			"git",
			["diff", "--name-status", "--find-renames", getDiffBase(), "HEAD"],
			{ encoding: "utf8" },
		);

		return output
			.trim()
			.split("\n")
			.filter(Boolean)
			.flatMap((line) => line.split("\t").slice(1));
	} catch (error) {
		console.warn(`无法读取 Git 变更，将提交完整站点地图：${error.message}`);
		return null;
	}
}

function contentUrl(file) {
	const match = file.match(/^src\/content\/(posts|devlogs)\/(.+)\.md$/);
	if (!match) return null;

	const [, collection, filename] = match;
	const slug = filename.toLowerCase().replaceAll(".", "").replace(/\s+/g, "-");
	return `${siteOrigin}/${collection}/${encodeURI(slug)}/`;
}

function selectChangedUrls(allUrls) {
	if (submitAll) return allUrls;

	const changedFiles = getChangedFiles();
	if (!changedFiles) return allUrls;

	const structuralChange = changedFiles.some((file) =>
		[
			"astro.config.mjs",
			"src/config.ts",
			"src/components/",
			"src/layouts/",
			"src/pages/",
			"src/plugins/",
			"src/styles/",
		].some((prefix) => file === prefix || file.startsWith(prefix)),
	);
	if (structuralChange) return allUrls;

	const selected = new Set();
	for (const file of changedFiles) {
		const url = contentUrl(file);
		if (!url) continue;

		selected.add(url);
		selected.add(`${siteOrigin}/`);
		selected.add(`${siteOrigin}/archive/`);
		if (file.startsWith("src/content/devlogs/")) {
			selected.add(`${siteOrigin}/devlogs/`);
		}
	}

	return [...selected];
}

async function waitForPublishedKey() {
	for (let attempt = 1; attempt <= 6; attempt += 1) {
		try {
			const response = await fetch(keyLocation, { cache: "no-store" });
			const body = (await response.text()).trim();
			if (response.ok && body === indexNowKey) return;
		} catch (error) {
			console.warn(`IndexNow 密钥验证第 ${attempt} 次失败：${error.message}`);
		}

		if (attempt < 6) {
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	throw new Error(`部署后仍无法验证 IndexNow 密钥文件：${keyLocation}`);
}

const sitemapUrls = readSitemapUrls();
const urlList = selectChangedUrls(sitemapUrls);

if (urlList.length === 0) {
	console.log("本次部署没有需要通知 IndexNow 的页面。");
	process.exit(0);
}

console.log(`准备向 IndexNow 提交 ${urlList.length} 个 URL。`);
if (dryRun) {
	console.log(urlList.join("\n"));
	process.exit(0);
}

await waitForPublishedKey();

const response = await fetch("https://api.indexnow.org/indexnow", {
	method: "POST",
	headers: {
		"Content-Type": "application/json; charset=utf-8",
	},
	body: JSON.stringify({
		host: siteHost,
		key: indexNowKey,
		keyLocation,
		urlList,
	}),
});

if (![200, 202].includes(response.status)) {
	const responseBody = await response.text();
	throw new Error(
		`IndexNow 提交失败：HTTP ${response.status}${responseBody ? ` ${responseBody}` : ""}`,
	);
}

console.log(
	`IndexNow 已接受 ${urlList.length} 个 URL（HTTP ${response.status}）。`,
);
