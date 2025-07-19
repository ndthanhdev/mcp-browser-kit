#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import path from "node:path";

$.verbose = true;
cd(workDirs.path);

// Configuration
interface BuildConfig {
	sourcePattern: string;
	outputDir: string;
	tarsDir: string;
	appsDir: string;
}

interface BuildTarget {
	name: string;
	sourcePath: string;
	targetPath: string;
	tarPath: string;
}

const buildConfig: BuildConfig = {
	sourcePattern: "apps/*/build",
	outputDir: workDirs.build.path,
	tarsDir: workDirs.build.tars.path,
	appsDir: workDirs.build.apps.path,
};

// Pure functions for build operations
const extractAppNameFromPath = (buildPath: string): string => {
	return buildPath.split("/")[1];
};

const createBuildTarget = (buildDir: string, config: BuildConfig): BuildTarget => {
	const name = extractAppNameFromPath(buildDir);
	return {
		name,
		sourcePath: buildDir,
		targetPath: path.join(config.appsDir, name),
		tarPath: path.join(config.tarsDir, `${name}.tar.gz`),
	};
};

const copyBuildArtifacts = async (target: BuildTarget): Promise<void> => {
	await fse.copy(target.sourcePath, target.targetPath);
	console.log(`Copied ${target.sourcePath} to ${target.targetPath}`);
};

const createTarArchive = async (target: BuildTarget, config: BuildConfig): Promise<void> => {
	await $`tar -czf ${target.tarPath} -C ${config.appsDir} ${target.name}`;
	console.log(`Created tar.gz: ${target.tarPath}`);
};

const processBuildTarget = async (target: BuildTarget, config: BuildConfig): Promise<void> => {
	await copyBuildArtifacts(target);
	await createTarArchive(target, config);
};

const prepareBuildDirectories = async (config: BuildConfig): Promise<void> => {
	await fse.emptyDir(config.outputDir);
	await fse.ensureDir(config.tarsDir);
};

const discoverBuildTargets = async (config: BuildConfig): Promise<BuildTarget[]> => {
	const buildDirs = await glob([config.sourcePattern], { onlyFiles: false });
	return buildDirs.map(buildDir => createBuildTarget(buildDir, config));
};

// Main execution pipeline
const runBuildPipeline = async (config: BuildConfig): Promise<void> => {
	await pipeOutput($`moon :build`);
	await prepareBuildDirectories(config);
	
	const targets = await discoverBuildTargets(config);
	await Promise.all(targets.map(target => processBuildTarget(target, config)));
};

// Execute the build
await runBuildPipeline(buildConfig);
