#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import path from "node:path";

$.verbose = true;
cd(workDirs.path);

// Build apps and create release archives
await pipeOutput($`moon :build`);

// Prepare output directories
await fse.emptyDir(workDirs.target.path);
await fse.emptyDir(workDirs.target.release.path);

// Find all built apps and process them
const buildDirs = await glob(["apps/*/target"], { onlyFiles: false });

await Promise.all(buildDirs.map(async (buildDir) => {
	const appName = buildDir.split("/")[1];
	const targetPath = path.join(workDirs.target.apps.path, appName);
	const tarPath = path.join(workDirs.target.release.path, `${appName}.tar.gz`);
	
	// Copy build artifacts
	await fse.copy(buildDir, targetPath);
	console.log(`Copied ${buildDir} to ${targetPath}`);
	
	// Create tar.gz archive
	await $`tar -czf ${tarPath} -C ${workDirs.target.apps.path} ${appName}`;
	console.log(`Created tar.gz: ${tarPath}`);
}));
