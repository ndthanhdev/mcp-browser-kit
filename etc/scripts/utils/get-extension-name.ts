import * as path from "node:path";
import { kebabCase } from "change-case";
import fse from "fs-extra";

export const getExtensionName = async (extensionDir: string) => {
	const packageJsonPath = path.join(extensionDir, "package.json");
	const packageJson = await fse.readJSON(packageJsonPath);

	const manifestJsonPath = path.join(extensionDir, "src", "manifest.json");
	const manifestJson = await fse.readJSON(manifestJsonPath);

	return `${kebabCase(packageJson.name)}-${manifestJson.version}`;
};
