#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import { FirefoxSignEnvNames, getFirefoxSignEnvs } from "../utils/get-envs";

$.verbose = true;
cd(workDirs.path);

const env = getFirefoxSignEnvs();

await $`${[
	"web-ext",
	"sign",
	"--source-dir",
	env[FirefoxSignEnvNames.SourceDir],
	"--artifacts-dir",
	env[FirefoxSignEnvNames.ArtifactsDir],
	"--api-key",
	`$${FirefoxSignEnvNames.FirefoxApiKey}`,
	"--api-secret",
	`$${FirefoxSignEnvNames.FirefoxApiSecret}`,
	"--channel",
	"unlisted",
]}`;
