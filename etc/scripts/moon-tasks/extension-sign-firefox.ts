#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import * as R from "ramda";
import { getFirefoxChannel, getProjectRoot } from "../utils/get-envs";
import { getExtensionName } from "../utils/get-extension-name";

$.verbose = true;
cd(workDirs.path);

const projectRoot = getProjectRoot();

const sourceDir = path.resolve(projectRoot, "target/extension/tmp/extension");
const signArtifactTmpDir = path.resolve(
	projectRoot,
	"target/extension/tmp/sign-artifacts",
);
const distDir = path.resolve(projectRoot, "target/extension/dist");
const extensionName = await getExtensionName(projectRoot);

const channel = getFirefoxChannel();
console.log(`Signing for Firefox channel "${channel}"`);

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

// AMO requires a summary, categories, and license for an extension's first
// listed version, even if the extension already exists as unlisted.
if (channel === "listed") {
	const manifestJson = await fse.readJSON(
		path.resolve(projectRoot, "src/manifest.json"),
	);

	const amoMetadataPath = path.resolve(
		projectRoot,
		"target/extension/tmp/amo-metadata.json",
	);
	await fse.outputJSON(amoMetadataPath, {
		summary: {
			"en-US": manifestJson.description,
		},
		categories: [
			"other",
		],
		version: {
			license: "MIT",
		},
	});

	command.push("--amo-metadata", amoMetadataPath);
}

const commandString = command.join(" ");

await $({
	quote: R.identity<string>,
})`${commandString}`;

const signedFile = await glob(`${signArtifactTmpDir}/*`);

if (signedFile.length === 0) {
	console.error(`No .xpi file found in ${signArtifactTmpDir}`);
	process.exit(1);
}

const fileExtension = path.extname(signedFile[0]);
const signedFileName = `${extensionName}${fileExtension}`;

await fse.copy(signedFile[0], path.resolve(distDir, signedFileName));
