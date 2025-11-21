#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import fse from "fs-extra";
import {
	ExtensionCopyAssetsEnvNames,
	getExtensionCopyAssetsEnvs,
} from "../utils/get-envs";

const env = getExtensionCopyAssetsEnvs();

const projectRoot = env[ExtensionCopyAssetsEnvNames.ProjectRoot];
const workspaceRoot = env[ExtensionCopyAssetsEnvNames.WorkspaceRoot];

await fse.emptyDir(`${projectRoot}/target/extension/`);
await fse.copy(
	`${projectRoot}/target/tsup/dist/`,
	`${projectRoot}/target/extension/tmp/extension/`,
);
await fse.copy(
	`${projectRoot}/src/manifest.json`,
	`${projectRoot}/target/extension/tmp/extension/manifest.json`,
);
await fse.copy(
	`${projectRoot}/assets/`,
	`${projectRoot}/target/extension/tmp/extension/assets/`,
);
await fse.copy(
	`${workspaceRoot}/node_modules/webextension-polyfill/dist/`,
	`${projectRoot}/target/extension/tmp/extension/vendors/webextension-polyfill/`,
);
