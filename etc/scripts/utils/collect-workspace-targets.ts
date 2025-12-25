import "zx/globals";
import path from "node:path";
import fse from "fs-extra";
import { workDirs } from "./work-dirs";

export async function collectWorkspaceTargets() {
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
}



