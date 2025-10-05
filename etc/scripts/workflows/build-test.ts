#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import fse from "fs-extra";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

await fse.emptyDir(workDirs.target.release.path);

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
	"with-action",
	"--action",
	"test",
	"with-action",
	"--action",
	"build",
	"container",
	"directory",
	`--path=${workDirs.target.release.relativePath}`,
	"export",
	`--path=${workDirs.target.release.path}`,
]}`;
