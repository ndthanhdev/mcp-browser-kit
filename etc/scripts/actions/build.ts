#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import path from "node:path";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";

$.verbose = true;
cd(workDirs.path);

// Build apps and create release archives
await pipeOutput($`moon :build`);

// Prepare output directories
await fse.emptyDir(workDirs.target.path);
await fse.emptyDir(workDirs.target.release.path);

// Find all built apps and process them
const targetDirs = await glob(
	[
		"apps/*/target",
	],
	{
		onlyFiles: false,
	},
);

await Promise.all(
	targetDirs.map(async (buildDir) => {
		const appName = buildDir.split("/")[1];
		const targetPath = path.join(workDirs.target.apps.path, appName);

		// Copy build artifacts
		await fse.copy(buildDir, targetPath);
		console.log(`Copied ${buildDir} to ${targetPath}`);
	}),
);

const extensionZips = await glob([
	"target/apps/**/extension/dist/*.zip",
]);

await Promise.all(
	extensionZips.map(async (zipPath) => {
		const targetZipPath = path.join(
			workDirs.target.release.path,
			path.basename(zipPath),
		);

		await fse.copy(zipPath, targetZipPath);
		console.log(`Copied extension zip: ${targetZipPath}`);
	}),
);
