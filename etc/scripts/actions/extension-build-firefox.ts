#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import * as R from "ramda";
import { getProjectRoot } from "../utils/get-envs";
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
	"unlisted",
].join(" ");

await $({
	quote: R.identity<string>,
})`${command}`;

const signedFile = await glob(`${signArtifactTmpDir}/*`);
const fileExtension = path.extname(signedFile[0]);
const signedFileName = `${extensionName}${fileExtension}`;

await fse.copy(signedFile[0], path.resolve(distDir, signedFileName));
