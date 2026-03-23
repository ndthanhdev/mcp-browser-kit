#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import semver from "semver";
import simpleGit from "simple-git";
import { getReleaseTag } from "../utils/get-envs";

let rawTag = getReleaseTag();

if (rawTag) {
	console.log(`Using RELEASE_TAG from environment: "${rawTag}"`);
} else {
	console.log("RELEASE_TAG not set, falling back to git tag lookup...");
	const git = simpleGit(workDirs.path);
	const tagOutput = await git.raw([
		"tag",
		"--points-at",
		"HEAD",
		"--sort=-creatordate",
	]);
	const tags = tagOutput.trim().split("\n").filter(Boolean);

	if (tags.length === 0) {
		console.error("No git tag found on HEAD.");
		process.exit(1);
	}

	rawTag = tags[0];
	console.log(`Found git tag "${rawTag}"`);
}

// V0 tags use the format v0.yyMMd.dhhmm-ss (e.g., v0.26032.00830-05).
// These contain leading zeros which makes them invalid semver, so we parse them manually.
// Release tags use standard semver (e.g., v1.2.3).

const v0Match = rawTag.match(/^v(0\.\d{5}\.\d{5})-(\d{2})$/);

// Replace leading zeros with 9 to produce valid version segments
// that preserve the original string length (e.g., "00830" → "99830", "05" → "95").
const replaceLeadingZeros = (s: string) =>
	s.replace(/^0+/, (m) => "9".repeat(m.length));

let extensionVersion: string;
let serverVersion: string;

if (v0Match) {
	// V0 dev tag: v0.yyMMd.dhhmm-ss
	// Replace leading zeros with 9 in numeric segments to produce valid versions.
	// Extensions: major.minor.patch.pre (4-part dotted, Firefox rejects leading zeros)
	// Server: major.minor.patch-experimental.pre (valid semver, dot-separated prerelease
	//         so that parsed.prerelease[0] === "experimental" becomes the npm dist-tag)
	const [major, minor, patch] = v0Match[1].split(".");
	extensionVersion = `${major}.${minor}.${replaceLeadingZeros(patch)}.${replaceLeadingZeros(v0Match[2])}`;
	serverVersion = `${major}.${minor}.${replaceLeadingZeros(patch)}-experimental.${replaceLeadingZeros(v0Match[2])}`;
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
