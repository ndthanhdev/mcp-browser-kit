import "zx/globals";
import path from "node:path";
import fse from "fs-extra";
import { workDirs } from "./work-dirs";

const PROMPT_EVALS_PASS_RATE_THRESHOLD = 90;
const REPORT_RELATIVE_PATH = "apps/prompt-evals/target/promptfoo";
/** One promptfoo suite per prompt set; each writes `<suite>/results.json` under the report dir. */
const EVAL_SUITES = [
	"mcp",
	"agent",
] as const;
/** OpenAI-compatible endpoint and key for the model under evaluation. */
const LLM_SECRET_NAMES = [
	"PROMPT_EVALS_LLM_BASE_URL",
	"PROMPT_EVALS_LLM_API_KEY",
] as const;
/** Id of the model under evaluation, as the endpoint names it. */
const LLM_MODEL_NAME = "PROMPT_EVALS_LLM_MODEL";

interface PromptfooResults {
	results: {
		stats: {
			successes: number;
			failures: number;
			errors: number;
		};
	};
}

/**
 * Runs `prompt-evals:eval` (the MCP server and browser agent suites) inside the
 * Dagger build env, exports the promptfoo reports, then fails when either
 * suite's pass rate is below the threshold. promptfoo's own exit code is
 * disabled in the container so the reports are exported even when tests fail.
 */
export const runPromptEvals = async () => {
	const missingKeys = [
		...LLM_SECRET_NAMES,
		LLM_MODEL_NAME,
	].filter((name) => !process.env[name]);
	if (missingKeys.length > 0) {
		throw new Error(`Missing environment variables: ${missingKeys.join(", ")}`);
	}

	const reportDir = path.resolve(workDirs.path, REPORT_RELATIVE_PATH);
	await fse.emptyDir(reportDir);

	cd(workDirs.etc.workflowRuntime.path);

	await $`${[
		"dagger",
		"call",
		"--dir",
		workDirs.path,
		"build-env",
		"with-env-variable",
		"--name",
		"MODE",
		"--value",
		"dev",
		"with-env-variable",
		"--name",
		"CI",
		"--value",
		"true",
		"with-env-variable",
		"--name",
		"PROMPTFOO_FAILED_TEST_EXIT_CODE",
		"--value",
		"0",
		"with-env-variable",
		"--name",
		LLM_MODEL_NAME,
		"--value",
		process.env[LLM_MODEL_NAME] as string,
		...LLM_SECRET_NAMES.flatMap((name) => [
			"with-secret-variable",
			"--name",
			name,
			"--secret",
			`env:${name}`,
		]),
		"with-moon-task",
		"--task",
		"scripts:git-shallow-remove",
		"with-moon-task",
		"--task",
		"prompt-evals:eval",
		"container",
		"directory",
		`--path=${REPORT_RELATIVE_PATH}`,
		"export",
		`--path=${reportDir}`,
	]}`;

	const summaries = await Promise.all(
		EVAL_SUITES.map((suite) => summarizeSuite(reportDir, suite)),
	);
	for (const { summary } of summaries) {
		echo(summary);
	}
	const failing = summaries.filter(({ passed }) => !passed);
	if (failing.length > 0) {
		throw new Error(failing.map(({ summary }) => summary).join("\n"));
	}
};

const summarizeSuite = async (reportDir: string, suite: string) => {
	const { results } = (await fse.readJson(
		path.resolve(reportDir, suite, "results.json"),
	)) as PromptfooResults;
	const { successes, failures, errors } = results.stats;
	const total = successes + failures + errors;
	const passRate = total === 0 ? 0 : (successes / total) * 100;
	return {
		passed: passRate >= PROMPT_EVALS_PASS_RATE_THRESHOLD,
		summary: `${suite} evals pass rate ${passRate.toFixed(2)}% (${successes} passed, ${failures} failed, ${errors} errors), threshold ${PROMPT_EVALS_PASS_RATE_THRESHOLD}%`,
	};
};
