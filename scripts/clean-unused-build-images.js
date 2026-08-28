#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), process.argv[2] || "dist");
const assetsDir = path.join(distDir, "_astro");
const IMAGE_EXTENSIONS = new Set([
	".avif",
	".gif",
	".jpeg",
	".jpg",
	".png",
	".svg",
	".webp",
]);
const REFERENCE_EXTENSIONS = new Set([
	".css",
	".html",
	".js",
	".json",
	".mjs",
	".txt",
	".xml",
]);

function walkFiles(directory) {
	if (!fs.existsSync(directory)) return [];
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const filePath = path.join(directory, entry.name);
		return entry.isDirectory() ? walkFiles(filePath) : [filePath];
	});
}

if (!fs.existsSync(assetsDir)) {
	console.error(`[build-clean] 资源目录不存在：${assetsDir}`);
	process.exitCode = 1;
} else {
	const allFiles = walkFiles(distDir);
	const searchableFiles = allFiles.filter((file) =>
		REFERENCE_EXTENSIONS.has(path.extname(file).toLowerCase()),
	);
	const referencedContent = searchableFiles
		.map((file) => fs.readFileSync(file, "utf8"))
		.join("\n");
	const imageFiles = allFiles.filter(
		(file) =>
			file.startsWith(`${assetsDir}${path.sep}`) &&
			IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()),
	);

	let removedCount = 0;
	let removedBytes = 0;
	for (const imageFile of imageFiles) {
		const filename = path.basename(imageFile);
		if (referencedContent.includes(filename)) continue;

		const size = fs.statSync(imageFile).size;
		fs.unlinkSync(imageFile);
		removedCount += 1;
		removedBytes += size;
	}

	console.log(
		`[build-clean] 已删除 ${removedCount} 个无人引用的构建图片，释放 ${(removedBytes / 1024 / 1024).toFixed(1)} MB。`,
	);
}
