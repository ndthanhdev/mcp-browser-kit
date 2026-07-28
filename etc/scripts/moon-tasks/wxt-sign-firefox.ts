#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import * as R from "ramda";
import { getProjectRoot } from "../utils/get-envs";
import { NEXT_M2_ARTIFACT } from "../utils/next-artifacts";

$.verbose = true;
cd(workDirs.path);

const projectRoot = getProjectRoot();

const sourceDir = path.resolve(projectRoot, ".output/firefox-mv2");
const signArtifactTmpDir = path.resolve(
	projectRoot,
	"target/extension/tmp/sign-artifacts",
);
const distDir = path.resolve(projectRoot, "target/extension/dist");

// This extension ships on the beta channel only, so it is always signed as
// unlisted regardless of the release tag. Unlisted submissions need no
// amo-metadata.json, but they do require an explicit gecko id (set in
// wxt.config.ts).
const channel = "unlisted";
console.log(`Signing for Firefox channel "${channel}"`);

await fse.emptyDir(signArtifactTmpDir);

const command = [
	"web-ext",
	"sign",
	"--source-dir",
	sourceDir,
	"--artifacts-dir",
	signArtifactTmpDir,
	"--api-key",
	"$FIREFOX_API_KEY",
	"--api-secret",
	"$FIREFOX_API_SECRET",
	"--channel",
	channel,
];

const commandString = command.join(" ");

await $({
	quote: R.identity<string>,
})`${commandString}`;

const signedFile = await glob(`${signArtifactTmpDir}/*.xpi`);

if (signedFile.length === 0) {
	console.error(`No .xpi file found in ${signArtifactTmpDir}`);
	process.exit(1);
}

const target = path.resolve(distDir, NEXT_M2_ARTIFACT);
await fse.copy(signedFile[0], target, {
	overwrite: true,
});

console.log(`Signed ${signedFile[0]} → ${target}`);
