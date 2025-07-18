#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

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
	"stdout",
]}`;
