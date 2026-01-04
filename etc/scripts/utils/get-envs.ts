import { cleanEnv, str } from "envalid";

enum EnvVars {
	ProjectRoot = "PROJECT_ROOT",
	WorkspaceRoot = "WORKSPACE_ROOT",
	FirefoxApiKey = "FIREFOX_API_KEY",
	FirefoxApiSecret = "FIREFOX_API_SECRET",
}

const getEnv = (name: string): string => {
	const env = cleanEnv(process.env, {
		[name]: str(),
	});
	return env[name];
};

export const getProjectRoot = () => getEnv(EnvVars.ProjectRoot);

export const getWorkspaceRoot = () => getEnv(EnvVars.WorkspaceRoot);

export const getFirefoxApiKey = () => getEnv(EnvVars.FirefoxApiKey);

export const getFirefoxApiSecret = () => getEnv(EnvVars.FirefoxApiSecret);
