#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import path from "node:path";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";

$.verbose = true;
cd(workDirs.path);

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
	targetDirs.map(async (targetDir) => {
		const appName = targetDir.split("/")[1];
		const targetPath = path.join(workDirs.target.apps.path, appName);

		await fse.copy(targetDir, targetPath);
		console.log(`Copied ${targetDir} to ${targetPath}`);
	}),
);

const extensionDistFiles = await glob([
	"target/apps/**/extension/dist/*",
]);

await Promise.all(
	extensionDistFiles.map(async (filePath) => {
		const targetFilePath = path.join(
			workDirs.target.release.path,
			path.basename(filePath),
		);

		await fse.copy(filePath, targetFilePath);
		console.log(`Copied extension artifact: ${targetFilePath}`);
	}),
);
