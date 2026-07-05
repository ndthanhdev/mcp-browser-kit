#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import path from "node:path";
import fse from "fs-extra";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

const shardIndex = process.env.PW_SHARD_INDEX;
const shardTotal = process.env.PW_SHARD_TOTAL;

if (!shardIndex || !shardTotal) {
	throw new Error("PW_SHARD_INDEX and PW_SHARD_TOTAL must be set");
}

const blobReportDir = path.resolve(
	workDirs.path,
	"apps/ext-e2e/target/playwright/blob-report",
);
await fse.emptyDir(blobReportDir);

cd(workDirs.etc.workflowRuntime.path);

await $`${[
	"dagger",
	"call",
	"--dir",
	workDirs.path,
	"build-env",
	"with-env-variable",
	"--name",
	"MODE",
	"--value",
	"dev",
	"with-env-variable",
	"--name",
	"CI",
	"--value",
	"true",
	"with-env-variable",
	"--name",
	"PW_SHARD_INDEX",
	"--value",
	shardIndex,
	"with-env-variable",
	"--name",
	"PW_SHARD_TOTAL",
	"--value",
	shardTotal,
	"with-moon-task",
	"--task",
	"scripts:git-shallow-remove",
	"with-moon-task",
	"--task",
	"scripts:browser-install",
	"with-moon-task",
	"--task",
	"ext-e2e:playwright-test",
	"container",
	"directory",
	"--path=apps/ext-e2e/target/playwright/blob-report",
	"export",
	`--path=${blobReportDir}`,
]}`;
