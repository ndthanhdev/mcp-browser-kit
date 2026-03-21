#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import semver from "semver";
import simpleGit from "simple-git";

const git = simpleGit(workDirs.path);
const tags = await git.tags({
	"--points-at": "HEAD",
});

if (tags.all.length === 0) {
	console.error("No git tag found on HEAD.");
	process.exit(1);
}

const rawTag = tags.all[0];

console.log(`Found git tag "${rawTag}"`);

// V0 tags use the format v0.yyMMd.dhhmm-ss (e.g., v0.26032.00830-05).
// These contain leading zeros which makes them invalid semver, so we parse them manually.
// Release tags use standard semver (e.g., v1.2.3).

const v0Match = rawTag.match(/^v(0\.\d{5}\.\d{5})-(\d{2})$/);

let extensionVersion: string;
let serverVersion: string;

if (v0Match) {
	// V0 dev tag: v0.yyMMd.dhhmm-ss
	// Extensions: 0.yyMMd.dhhmm.ss (4-part dotted)
	// Server: 0.yyMMd.dhhmm-ss (semver with prerelease)
	extensionVersion = `${v0Match[1]}.${Number(v0Match[2])}`;
	serverVersion = `${v0Match[1]}-${v0Match[2]}`;
} else {
	// Release tag: standard semver (e.g., v1.2.3)
	const parsed = semver.parse(rawTag);

	if (!parsed) {
		console.error(
			`Invalid version tag: "${rawTag}" is not a recognized tag format.`,
		);
		process.exit(1);
	}

	extensionVersion = parsed.version;
	serverVersion = parsed.version;
}

console.log(`Extension version: ${extensionVersion}`);
console.log(`Server version: ${serverVersion}`);

const extensionFiles = [
	path.resolve(workDirs.apps.m2.path, "src/manifest.json"),
	path.resolve(workDirs.apps.m3.path, "src/manifest.json"),
];

const serverFiles = [
	path.resolve(workDirs.apps.server.path, "package.json"),
];

for (const file of extensionFiles) {
	const json = await fse.readJSON(file);
	json.version = extensionVersion;
	await fse.writeJSON(file, json, {
		spaces: "\t",
	});
	console.log(
		`Patched ${path.relative(workDirs.path, file)} → ${extensionVersion}`,
	);
}

for (const file of serverFiles) {
	const json = await fse.readJSON(file);
	json.version = serverVersion;
	await fse.writeJSON(file, json, {
		spaces: "\t",
	});
	console.log(
		`Patched ${path.relative(workDirs.path, file)} → ${serverVersion}`,
	);
}
