#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import fse from "fs-extra";
import { workDirs } from "../utils/work-dirs";

$.verbose = true;

await fse.emptyDir(workDirs.target.release.path);

cd(workDirs.etc.workflowRuntime.path);

const hasNpmToken = Boolean(process.env.YARN_NPM_AUTH_TOKEN);

// Build the npm auth args for the Dagger pipeline.
// If YARN_NPM_AUTH_TOKEN is available, use it directly (token-based auth).
// Otherwise, pass through the GitHub Actions environment variables so that
// `yarn npm publish --provenance` can build the SLSA provenance statement
// and perform an OIDC token exchange with the npm registry inside the container.
const githubEnvVars = [
	"CI",
	"GITHUB_ACTIONS",
	"GITHUB_SERVER_URL",
	"GITHUB_REPOSITORY",
	"GITHUB_REPOSITORY_ID",
	"GITHUB_REPOSITORY_OWNER_ID",
	"GITHUB_REF",
	"GITHUB_SHA",
	"GITHUB_RUN_ID",
	"GITHUB_RUN_ATTEMPT",
	"GITHUB_EVENT_NAME",
	"GITHUB_WORKFLOW_REF",
	"RUNNER_ENVIRONMENT",
];

const npmAuthArgs: string[] = hasNpmToken
	? [
			"with-secret-variable",
			"--name",
			"YARN_NPM_AUTH_TOKEN",
			"--secret",
			"env:YARN_NPM_AUTH_TOKEN",
		]
	: [
			...githubEnvVars.flatMap((name) => [
				"with-env-variable",
				"--name",
				name,
				"--value",
				process.env[name] ?? "",
			]),
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
	...(process.env.RELEASE_TAG
		? [
				"with-env-variable",
				"--name",
				"RELEASE_TAG",
				"--value",
				process.env.RELEASE_TAG,
			]
		: []),
	"with-moon-task",
	"--task",
	"scripts:versions-patch",
	"with-moon-task",
	"--task",
	"scripts:git-shallow-remove",
	"with-moon-task",
	"--task",
	":build",
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
	"with-moon-task",
	"--task",
	"server:npm-publish",
	"with-moon-task",
	"--task",
	"scripts:collect-workspace-targets",
	"container",
	"directory",
	`--path=${workDirs.target.relativePath}`,
	"export",
	`--path=${workDirs.target.path}`,
]}`;
