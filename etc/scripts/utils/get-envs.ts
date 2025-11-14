import { cleanEnv, str } from "envalid";

export enum FirefoxSignEnvNames {
	SourceDir = "SOURCE_DIR",
	ArtifactsDir = "ARTIFACTS_DIR",
	FirefoxApiKey = "FIREFOX_API_KEY",
	FirefoxApiSecret = "FIREFOX_API_SECRET",
}

export const getFirefoxSignEnvs = () => {
	return cleanEnv(process.env, {
		[FirefoxSignEnvNames.SourceDir]: str(),
		[FirefoxSignEnvNames.ArtifactsDir]: str(),
		[FirefoxSignEnvNames.FirefoxApiKey]: str(),
		[FirefoxSignEnvNames.FirefoxApiSecret]: str(),
	});
};
