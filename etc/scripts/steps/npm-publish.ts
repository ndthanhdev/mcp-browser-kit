#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { getYarnNpmAuthToken } from "@mcp-browser-kit/scripts/utils/get-envs";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import semver from "semver";

$.verbose = true;

const hasToken = !!process.env.YARN_NPM_AUTH_TOKEN;

if (hasToken) {
	getYarnNpmAuthToken();
}

const packageJsonPath = path.resolve(workDirs.apps.server.path, "package.json");
const packageJson = await fse.readJSON(packageJsonPath);
const parsed = semver.parse(packageJson.version);

if (!parsed) {
	console.error(
		`Invalid semver version "${packageJson.version}" in ${packageJsonPath}`,
	);
	process.exit(1);
}

const tag =
	parsed.prerelease.length > 0 ? String(parsed.prerelease[0]) : "latest";

console.log(
	`Publishing ${packageJson.name}@${parsed.version} with dist-tag "${tag}"`,
);

cd(workDirs.apps.server.path);

if (hasToken) {
	await pipeOutput($`yarn npm publish --tag ${tag} --access public`);
} else {
	await pipeOutput(
		$`yarn npm publish --tag ${tag} --access public --provenance`,
	);
}
