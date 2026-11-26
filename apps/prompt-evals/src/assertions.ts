import type { AssertionValueFunctionContext, GradingResult } from "promptfoo";

/**
 * Shape of `metadata.toolCalls`, as recorded by promptfoo providers that
 * execute MCP tools and by the browser agent provider.
 */
export interface McpToolCall {
	name: string;
	input: Record<string, unknown>;
}

interface MetadataContext {
	metadata?: Record<string, unknown>;
}

/** Input keys may be dotted paths into nested objects, e.g. `params.readablePath`. */
interface CallInputConfig {
	/** Tool whose first call is checked; defaults to the first call of any tool. */
	tool?: string;
	/** Keys that must equal these values exactly. */
	input?: Record<string, unknown>;
	/** Keys whose string value must match these regular expressions. */
	patterns?: Record<string, string>;
	/** Keys that must be omitted. */
	absent?: string[];
}

interface ToolListConfig {
	tools: string[];
}

const toolCallsOf = (context: MetadataContext): McpToolCall[] =>
	(context.metadata?.toolCalls as McpToolCall[] | undefined) ?? [];

const describeCalls = (calls: McpToolCall[]): string =>
	calls.length === 0
		? "(no tool calls)"
		: calls
				.map((call) => `${call.name}(${JSON.stringify(call.input)})`)
				.join(", ");

const result = (pass: boolean, reason: string): GradingResult => ({
	pass,
	score: pass ? 1 : 0,
	reason,
});

const requireConfig = <T>(context: AssertionValueFunctionContext): T => {
	if (!context.config) {
		throw new Error("This assertion requires a `config` block");
	}
	return context.config as T;
};

const valueAt = (input: Record<string, unknown>, key: string): unknown =>
	key
		.split(".")
		.reduce<unknown>(
			(value, part) =>
				value && typeof value === "object"
					? (value as Record<string, unknown>)[part]
					: undefined,
			input,
		);

/** Transform for `tool-call-f1`: grades only the model's first tool choice. */
export const firstToolCall = (
	_output: unknown,
	context: MetadataContext,
): McpToolCall[] => toolCallsOf(context).slice(0, 1);

/** Tools that only observe the browser; models may call them before acting. */
export const READ_TOOLS = [
	"getContext",
	"getReadableText",
	"getReadableElements",
	"getReadableElementHtml",
	"getSnapshotPage",
	"getSelection",
	"captureTab",
];

/** Transform for `tool-call-f1`: grades the first call that is not a read. */
export const firstActionCall = (
	_output: unknown,
	context: MetadataContext,
): McpToolCall[] =>
	toolCallsOf(context)
		.filter((call) => !READ_TOOLS.includes(call.name))
		.slice(0, 1);

/** Transform for `tool-call-f1` on read tests: grades the first call other than getContext. */
export const firstCallAfterContext = (
	_output: unknown,
	context: MetadataContext,
): McpToolCall[] =>
	toolCallsOf(context)
		.filter((call) => call.name !== "getContext")
		.slice(0, 1);

/** Fails when the model made more than `config.max` read calls. */
export const maxReads = (
	_output: string,
	context: AssertionValueFunctionContext,
): GradingResult => {
	const { max } = requireConfig<{
		max: number;
	}>(context);
	const reads = toolCallsOf(context).filter((call) =>
		READ_TOOLS.includes(call.name),
	);
	return reads.length <= max
		? result(true, `${reads.length} read calls (max ${max})`)
		: result(
				false,
				`${reads.length} read calls exceed max ${max}: ${describeCalls(reads)}`,
			);
};

/** Checks the arguments of the first call (of `config.tool`, when set) against `config`. */
export const firstCallInput = (
	_output: string,
	context: AssertionValueFunctionContext,
): GradingResult => {
	const config = requireConfig<CallInputConfig>(context);
	const calls = toolCallsOf(context);
	const call = config.tool
		? calls.find((candidate) => candidate.name === config.tool)
		: calls[0];
	if (!call) {
		return result(
			false,
			config.tool
				? `Expected a ${config.tool} call; got ${describeCalls(calls)}`
				: "Expected a tool call but the model made none",
		);
	}
	const problems: string[] = [];
	for (const [key, expected] of Object.entries(config.input ?? {})) {
		const actual = valueAt(call.input, key);
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			problems.push(
				`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
			);
		}
	}
	for (const [key, pattern] of Object.entries(config.patterns ?? {})) {
		const actual = valueAt(call.input, key);
		if (typeof actual !== "string" || !new RegExp(pattern).test(actual)) {
			problems.push(
				`${key}: ${JSON.stringify(actual)} does not match /${pattern}/`,
			);
		}
	}
	for (const key of config.absent ?? []) {
		const actual = valueAt(call.input, key);
		if (actual !== undefined) {
			problems.push(
				`${key}: expected to be omitted, got ${JSON.stringify(actual)}`,
			);
		}
	}
	return problems.length === 0
		? result(true, `${call.name} called with expected input`)
		: result(false, `${call.name} input mismatch: ${problems.join("; ")}`);
};

/** Passes when `config.tools` were all called in this order, with any calls in between. */
export const callSequence = (
	_output: string,
	context: AssertionValueFunctionContext,
): GradingResult => {
	const { tools } = requireConfig<ToolListConfig>(context);
	const calls = toolCallsOf(context);
	let next = 0;
	for (const call of calls) {
		if (call.name === tools[next]) next++;
		if (next === tools.length) break;
	}
	return next === tools.length
		? result(true, `Called in order: ${tools.join(" -> ")}`)
		: result(
				false,
				`Expected ${tools.join(" -> ")}; missing ${tools[next]} in ${describeCalls(calls)}`,
			);
};

/** Fails when any tool in `config.tools` was called. */
export const neverCalls = (
	_output: string,
	context: AssertionValueFunctionContext,
): GradingResult => {
	const { tools } = requireConfig<ToolListConfig>(context);
	const calls = toolCallsOf(context);
	const forbidden = calls.filter((call) => tools.includes(call.name));
	return forbidden.length === 0
		? result(true, `None of [${tools.join(", ")}] called`)
		: result(false, `Forbidden tool calls: ${describeCalls(forbidden)}`);
};

/** Fails when a tool outside `config.tools` was called; making no calls passes. */
export const onlyCalls = (
	_output: string,
	context: AssertionValueFunctionContext,
): GradingResult => {
	const { tools } = requireConfig<ToolListConfig>(context);
	const calls = toolCallsOf(context);
	const unexpected = calls.filter((call) => !tools.includes(call.name));
	return unexpected.length === 0
		? result(true, `Only [${tools.join(", ")}] called: ${describeCalls(calls)}`)
		: result(false, `Unexpected tool calls: ${describeCalls(unexpected)}`);
};
