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
	"with-moon-task",
	"--task",
	"scripts:git-shallow-remove",
	"with-moon-task",
	"--task",
	"scripts:playwright-install",
	"with-moon-command",
	"--command",
	"ci",
	"--args",
	"--force",
	"with-moon-task",
	"--task",
	"scripts:collect-workspace-targets",
	"container",
	"directory",
	`--path=${workDirs.target.relativePath}`,
	"export",
	`--path=${workDirs.target.path}`,
]}`;
