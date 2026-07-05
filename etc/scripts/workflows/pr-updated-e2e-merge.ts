#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import path from "node:path";
import fse from "fs-extra";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

const reportDir = path.resolve(workDirs.path, "apps/ext-e2e/playwright-report");
await fse.emptyDir(reportDir);

cd(workDirs.etc.workflowRuntime.path);

await $`${[
	"dagger",
	"call",
	"--dir",
	workDirs.path,
	"build-env",
	"with-env-variable",
	"--name",
	"CI",
	"--value",
	"true",
	"with-moon-task",
	"--task",
	"scripts:browser-install",
	"with-moon-task",
	"--task",
	"ext-e2e:merge-reports",
	"container",
	"directory",
	"--path=apps/ext-e2e/playwright-report",
	"export",
	`--path=${reportDir}`,
]}`;
