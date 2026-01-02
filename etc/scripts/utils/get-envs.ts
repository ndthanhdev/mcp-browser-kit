import { cleanEnv, str } from "envalid";

const getEnv = (name: string): string => {
	const env = cleanEnv(process.env, {
		[name]: str(),
	});
	return env[name];
};

export const getProjectRoot = () => getEnv("PROJECT_ROOT");

export const getWorkspaceRoot = () => getEnv("WORKSPACE_ROOT");

export const getFirefoxApiKey = () => getEnv("FIREFOX_API_KEY");

export const getFirefoxApiSecret = () => getEnv("FIREFOX_API_SECRET");
