import "zx/globals";
import path from "node:path";
import { parseEnv } from "node:util";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";

/** Container port of the promptfoo UI in etc/docker/docker-compose.yml. */
export const PROMPTFOO_UI_PORT = 15_500;

/**
 * Optional variables compose takes from the root `.env`: the UID/GID of the
 * container's `dev` user (defaulting to 1000) and the eval LLM settings, which
 * it passes into the container.
 */
const FILE_VARIABLE_NAMES = [
	"UID",
	"GID",
	"PROMPT_EVALS_LLM_BASE_URL",
	"PROMPT_EVALS_LLM_API_KEY",
	"PROMPT_EVALS_LLM_MODEL",
] as const;

type FileVariableName = (typeof FILE_VARIABLE_NAMES)[number];

/** Variables etc/docker/docker-compose.yml reads. */
export interface ComposeEnv extends Partial<Record<FileVariableName, string>> {
	/** Absolute path of this checkout; compose mounts it at the same path. */
	// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
	WORKSPACE_DIR: string;
	/**
	 * Absolute path of the repository's shared `.git`. A linked worktree's `.git`
	 * file points into it, so compose mounts it at the same path.
	 */
	// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
	GIT_COMMON_DIR: string;
	// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
	WORKTREE: string;
}

const readEnvFile = async (file: string): Promise<Record<string, string>> =>
	(await fse.pathExists(file))
		? (parseEnv(await fse.readFile(file, "utf8")) as Record<string, string>)
		: {};

const toLabel = (value: string): string =>
	value
		.toLowerCase()
		.replaceAll(/[^a-z\d-]+/gu, "-")
		.replaceAll(/^-+|-+$/gu, "");

/** `main` in the main checkout; the linked worktree's folder name otherwise. */
export const getWorktreeName = async (directory: string): Promise<string> => {
	const git = $({
		cwd: directory,
		quiet: true,
	});
	const outputs = await Promise.all([
		git`git rev-parse --path-format=absolute --git-dir`,
		git`git rev-parse --path-format=absolute --git-common-dir`,
		git`git rev-parse --show-toplevel`,
	]);
	const [gitDirectory, commonDirectory, topLevel] = outputs.map((output) =>
		output.stdout.trim(),
	);

	if (gitDirectory === commonDirectory) {
		return "main";
	}

	return toLabel(path.basename(topLevel));
};

/** Compose project of this worktree, matching `name:` in docker-compose.yml. */
export const getComposeProject = (env: ComposeEnv): string =>
	`mbk-${env.WORKTREE}`;

const getGitCommonDirectory = async (directory: string): Promise<string> => {
	const output = await $({
		cwd: directory,
		quiet: true,
	})`git rev-parse --path-format=absolute --git-common-dir`;

	return output.stdout.trim();
};

/**
 * Resolves WORKTREE and the root `.env` variables from the shell environment,
 * then the root `.env`; WORKTREE falls back to the worktree itself. Empty
 * values count as unset, as they do in compose's `${VAR:-default}`.
 */
export const getComposeEnv = async (
	directory = workDirs.path,
): Promise<ComposeEnv> => {
	const fileEnv = await readEnvFile(path.join(directory, ".env"));
	const read = (name: string): string | undefined =>
		process.env[name] || fileEnv[name] || undefined;
	const fileVariables = Object.fromEntries(
		FILE_VARIABLE_NAMES.map((name) => [
			name,
			read(name),
		]).filter(([, value]) => value),
	) as Partial<Record<FileVariableName, string>>;
	const override = read("WORKTREE");
	const worktree = override
		? toLabel(override)
		: await getWorktreeName(directory);

	if (!worktree) {
		throw new Error(
			`WORKTREE must contain letters or digits, got "${override ?? ""}"`,
		);
	}

	return {
		...fileVariables,
		// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
		WORKSPACE_DIR: directory,
		// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
		GIT_COMMON_DIR: await getGitCommonDirectory(directory),
		// biome-ignore lint/style/useNamingConvention: environment variable read by docker compose.
		WORKTREE: worktree,
	};
};
