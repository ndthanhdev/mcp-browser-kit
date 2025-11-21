import { cleanEnv, str } from "envalid";

export enum ExtensionCopyAssetsEnvNames {
	ProjectRoot = "PROJECT_ROOT",
	WorkspaceRoot = "WORKSPACE_ROOT",
}

export const getExtensionCopyAssetsEnvs = () => {
	return cleanEnv(process.env, {
		[ExtensionCopyAssetsEnvNames.ProjectRoot]: str(),
		[ExtensionCopyAssetsEnvNames.WorkspaceRoot]: str(),
	});
};

export enum ExtensionBuildEnvNames {
	ProjectRoot = "PROJECT_ROOT",
}

export const getExtensionBuildEnvs = () => {
	return cleanEnv(process.env, {
		[ExtensionBuildEnvNames.ProjectRoot]: str(),
	});
};

export enum FirefoxSignEnvNames {
	ProjectRoot = "PROJECT_ROOT",
	FirefoxApiKey = "FIREFOX_API_KEY",
	FirefoxApiSecret = "FIREFOX_API_SECRET",
}

export const getFirefoxSignEnvs = () => {
	return cleanEnv(process.env, {
		[FirefoxSignEnvNames.ProjectRoot]: str(),
		[FirefoxSignEnvNames.FirefoxApiKey]: str(),
		[FirefoxSignEnvNames.FirefoxApiSecret]: str(),
	});
};
