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
	"release",
	"with-step",
	"--step",
	"ci",
	"with-secret-variable",
	"--name",
	"FIREFOX_API_KEY",
	"--secret",
	"env:FIREFOX_API_KEY",
	"with-secret-variable",
	"--name",
	"FIREFOX_API_SECRET",
	"--secret",
	"env:FIREFOX_API_SECRET",
	"with-moon-task",
	"--task",
	"m2:extension-build-firefox",
	"with-secret-variable",
	"--name",
	"YARN_NPM_AUTH_TOKEN",
	"--secret",
	"env:YARN_NPM_AUTH_TOKEN",
	"with-step",
	"--step",
	"npm-publish",
	"container",
	"directory",
	`--path=${workDirs.target.relativePath}`,
	"export",
	`--path=${workDirs.target.path}`,
]}`;
