#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import { getProjectRoot } from "../utils/get-envs";
import { NEXT_M3_ARTIFACT } from "../utils/next-artifacts";

$.verbose = true;
cd(workDirs.path);

const projectRoot = getProjectRoot();

const outputDir = path.resolve(projectRoot, ".output");
const distDir = path.resolve(projectRoot, "target/extension/dist");

const candidates = await glob(`${outputDir}/*-chrome.zip`);

if (candidates.length === 0) {
	console.error(`No chrome zip found in ${outputDir}`);
	process.exit(1);
}

// `.output` is not cleaned between builds locally, so pick the freshest zip.
const withMtime = await Promise.all(
	candidates.map(async (filePath) => ({
		filePath,
		mtimeMs: (await fse.stat(filePath)).mtimeMs,
	})),
);
const newest = withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs)[0].filePath;

const target = path.resolve(distDir, NEXT_M3_ARTIFACT);
await fse.copy(newest, target, {
	overwrite: true,
});

console.log(`Collected ${newest} → ${target}`);
