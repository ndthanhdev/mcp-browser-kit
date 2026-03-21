#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import fse from "fs-extra";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

await fse.emptyDir(workDirs.target.release.path);

cd(workDirs.etc.workflowRuntime.path);

const hasNpmToken = !!process.env.YARN_NPM_AUTH_TOKEN;

// Build the npm auth args for the Dagger pipeline.
// If YARN_NPM_AUTH_TOKEN is available, use it directly (token-based auth).
// Otherwise, pass through the GitHub Actions OIDC variables so that
// `yarn npm publish --provenance` can perform an OIDC token exchange
// with the npm registry inside the container.
const npmAuthArgs: string[] = hasNpmToken
	? [
			"with-secret-variable",
			"--name",
			"YARN_NPM_AUTH_TOKEN",
			"--secret",
			"env:YARN_NPM_AUTH_TOKEN",
		]
	: [
			"with-env-variable",
			"--name",
			"CI",
			"--value",
			"true",
			"with-env-variable",
			"--name",
			"GITHUB_ACTIONS",
			"--value",
			"true",
			"with-secret-variable",
			"--name",
			"ACTIONS_ID_TOKEN_REQUEST_URL",
			"--secret",
			"env:ACTIONS_ID_TOKEN_REQUEST_URL",
			"with-secret-variable",
			"--name",
			"ACTIONS_ID_TOKEN_REQUEST_TOKEN",
			"--secret",
			"env:ACTIONS_ID_TOKEN_REQUEST_TOKEN",
		];

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
	"versions-patch",
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
	"m2:extension-sign-firefox",
	...npmAuthArgs,
	"with-step",
	"--step",
	"npm-publish",
	"container",
	"directory",
	`--path=${workDirs.target.relativePath}`,
	"export",
	`--path=${workDirs.target.path}`,
]}`;
