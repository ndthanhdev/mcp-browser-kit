import type { Logger, LoggerFactory } from "@mcp-browser-kit/types";
import * as changeCase from "change-case";
import type { ConsolaReporter, LogObject } from "consola";
import { consola, createConsola, LogLevels } from "consola";
import type { Container } from "inversify";
import { injectable } from "inversify";
import * as R from "ramda";

consola.level = LogLevels.verbose;
const defaultInstance = createConsola({
	level: LogLevels.verbose,
	fancy: true,
}).withTag("mbk");

const createLoggerId = (...components: string[]) => {
	const id = R.pipe(R.map(changeCase.camelCase), R.join(":"))(components);

	return id;
};

// Type and level color mappings from fancy reporter
const TYPE_COLOR_MAP: Record<string, string> = {
	info: "cyan",
	fail: "red",
	success: "green",
	ready: "green",
	start: "magenta",
};

const LEVEL_COLOR_MAP: Record<number, string> = {
	0: "red",
	1: "yellow",
};

// Unicode support detection
const isUnicodeSupported = () => {
	if (typeof process !== "undefined" && process.platform === "win32") {
		return Boolean(process.env.WT_SESSION || process.env.TERMINUS_SUBLIME);
	}
	return true;
};

const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);

// Type icons from fancy reporter
const TYPE_ICONS: Record<string, string> = {
	error: s("✖", "×"),
	fatal: s("✖", "×"),
	ready: s("✔", "√"),
	warn: s("⚠", "‼"),
	info: s("ℹ", "i"),
	success: s("✔", "√"),
	debug: s("⚙", "D"),
	trace: s("→", "→"),
	fail: s("✖", "×"),
	start: s("◐", "o"),
	log: "",
};

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
	cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
	red: (str: string) => `\x1b[31m${str}\x1b[0m`,
	green: (str: string) => `\x1b[32m${str}\x1b[0m`,
	yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
	magenta: (str: string) => `\x1b[35m${str}\x1b[0m`,
	black: (str: string) => `\x1b[30m${str}\x1b[0m`,
	underline: (str: string) => `\x1b[4m${str}\x1b[0m`,
	bgRed: (str: string) => `\x1b[41m${str}\x1b[0m`,
	bgYellow: (str: string) => `\x1b[43m${str}\x1b[0m`,
	bgCyan: (str: string) => `\x1b[46m${str}\x1b[0m`,
	bgGreen: (str: string) => `\x1b[42m${str}\x1b[0m`,
	bgMagenta: (str: string) => `\x1b[45m${str}\x1b[0m`,
};

// Helper functions from fancy reporter
const getColor = (color = "gray") => {
	const colorMap: Record<string, (str: string) => string> = {
		gray: colors.gray,
		cyan: colors.cyan,
		red: colors.red,
		green: colors.green,
		yellow: colors.yellow,
		magenta: colors.magenta,
	};
	return colorMap[color] || colors.gray;
};

const getBgColor = (color = "gray") => {
	const bgColorMap: Record<string, (str: string) => string> = {
		red: colors.bgRed,
		yellow: colors.bgYellow,
		cyan: colors.bgCyan,
		green: colors.bgGreen,
		magenta: colors.bgMagenta,
	};
	return bgColorMap[color] || colors.bgRed;
};

const characterFormat = (str: string) => {
	return (
		str
			// highlight backticks
			.replace(/`([^`]+)`/gm, (_, m) => colors.cyan(m))
			// underline underscores
			.replace(/\s+_([^_]+)_\s+/gm, (_, m) => ` ${colors.underline(m)} `)
	);
};

const formatArgs = (args: unknown[]): string => {
	return args
		.map((arg) => {
			if (typeof arg === "string") {
				return arg;
			}
			if (arg instanceof Error) {
				return arg.stack || arg.message;
			}
			return JSON.stringify(arg, null, 2);
		})
		.join(" ");
};

const formatType = (logObj: LogObject, isBadge: boolean) => {
	const typeColor =
		TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";

	if (isBadge) {
		return getBgColor(typeColor)(
			colors.black(` ${logObj.type.toUpperCase()} `),
		);
	}

	const _type =
		typeof TYPE_ICONS[logObj.type] === "string"
			? TYPE_ICONS[logObj.type]
			: logObj.type;

	return _type ? getColor(typeColor)(_type) : "";
};

const formatDate = (date: Date): string => {
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
};

const parseStack = (stack: string, message: string): string[] => {
	const lines = stack.split("\n");
	return lines
		.filter((line) => line.includes("at ") && !line.includes(message))
		.slice(0, 5); // Limit stack trace
};

const formatStack = (stack: string, message: string): string => {
	const indent = "  ";
	return `\n${indent}${parseStack(stack, message)
		.map(
			(line) =>
				`  ${line
					.replace(/^at +/, (m) => colors.gray(m))
					.replace(/\((.+)\)/, (_, m) => `(${colors.cyan(m)})`)}`,
		)
		.join(`\n${indent}`)}`;
};

// Format log object into a formatted string
const formatLogOutput = (logObj: LogObject): string => {
	const [message, ...additional] = formatArgs(logObj.args).split("\n");

	const date = formatDate(logObj.date);
	const coloredDate = date && colors.gray(date);

	const isBadge = logObj.level < 2;
	const type = formatType(logObj, isBadge);

	const tag = logObj.tag ? colors.gray(logObj.tag) : "";

	const left = [
		type,
		characterFormat(message),
	]
		.filter(Boolean)
		.join(" ");
	const right = [
		tag,
		coloredDate,
	]
		.filter(Boolean)
		.join(" ");

	let line = right ? `${colors.gray(`[${right}]`)} ${left}` : left;

	line += characterFormat(
		additional.length > 0 ? `\n${additional.join("\n")}` : "",
	);

	if (logObj.type === "trace") {
		const _err = new Error(`Trace: ${message}`);
		line += formatStack(_err.stack || "", _err.message);
	}

	return isBadge ? `\n${line}\n` : line;
};

// CSS color mapping for browser DevTools `%c` styling. Browser consoles do
// not render raw ANSI escape codes (unlike a terminal) — they print the
// literal escape bytes as garbled text. The native way to style browser
// console output is the `%c` format specifier, which consumes one CSS style
// string per occurrence, in order.
const CSS_COLORS: Record<string, string> = {
	gray: "color: #888888",
	cyan: "color: #0891b2",
	red: "color: #dc2626",
	green: "color: #16a34a",
	yellow: "color: #ca8a04",
	magenta: "color: #c026d3",
	black: "color: #000000",
};

const CSS_BADGES: Record<string, string> = {
	red: "background: #dc2626; color: #fff; border-radius: 3px; padding: 0 4px",
	yellow:
		"background: #ca8a04; color: #fff; border-radius: 3px; padding: 0 4px",
	cyan: "background: #0891b2; color: #fff; border-radius: 3px; padding: 0 4px",
	green: "background: #16a34a; color: #fff; border-radius: 3px; padding: 0 4px",
	magenta:
		"background: #c026d3; color: #fff; border-radius: 3px; padding: 0 4px",
};

const getCssColor = (color = "gray") => CSS_COLORS[color] || CSS_COLORS.gray;
const getCssBadge = (color = "red") => CSS_BADGES[color] || CSS_BADGES.red;

type BrowserSegment = {
	text: string;
	style: string;
};

// Builds a console.log-compatible (%c format string, style args, trailing
// args) triple. Browser consoles style output via sequential %c placeholders
// rather than nested ANSI escapes, so segments are flattened (no nested
// coloring like the terminal `[gray tag inside gray brackets]` above).
const buildBrowserLogOutput = (
	logObj: LogObject,
): {
	format: string;
	styles: string[];
	extraArgs: unknown[];
} => {
	const typeColor =
		TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";
	const isBadge = logObj.level < 2;

	const segments: BrowserSegment[] = [];

	const right = [
		logObj.tag,
		formatDate(logObj.date),
	]
		.filter(Boolean)
		.join(" ");
	if (right) {
		segments.push({
			text: `[${right}]`,
			style: getCssColor("gray"),
		});
		segments.push({
			text: " ",
			style: "",
		});
	}

	if (isBadge) {
		segments.push({
			text: ` ${logObj.type.toUpperCase()} `,
			style: getCssBadge(typeColor),
		});
		segments.push({
			text: " ",
			style: "",
		});
	} else {
		const type =
			typeof TYPE_ICONS[logObj.type] === "string"
				? TYPE_ICONS[logObj.type]
				: logObj.type;
		if (type) {
			segments.push({
				text: type,
				style: getCssColor(typeColor),
			});
			segments.push({
				text: " ",
				style: "",
			});
		}
	}

	// Only string args are folded into the styled message text. Non-string
	// args (Errors, objects) are passed through untouched so DevTools can
	// render them as live, expandable inspectors instead of flat JSON text.
	const stringArgs = logObj.args.filter(
		(arg): arg is string => typeof arg === "string",
	);
	const extraArgs = logObj.args.filter((arg) => typeof arg !== "string");

	segments.push({
		text: stringArgs.join(" "),
		style: "",
	});

	return {
		format: segments.map((segment) => `%c${segment.text}`).join(""),
		styles: segments.map((segment) => segment.style),
		extraArgs,
	};
};

// Enhanced reporter with fancy formatting for browser console
class FancyBrowserReporter implements ConsolaReporter {
	log(logObj: LogObject) {
		const { format, styles, extraArgs } = buildBrowserLogOutput(logObj);
		const args = [
			format,
			...styles,
			...extraArgs,
		];

		// Use appropriate console method based on log level/type
		switch (logObj.type) {
			case "error":
			case "fatal":
			case "fail":
				console.error(...args);
				break;
			case "warn":
				console.warn(...args);
				break;
			case "info":
			case "success":
			case "ready":
				console.info(...args);
				break;
			case "debug":
			case "trace":
			case "verbose":
				console.debug(...args);
				break;
			default:
				console.log(...args);
		}
	}
}

// Enhanced reporter with fancy formatting for error output only
class FancyErrorReporter implements ConsolaReporter {
	log(logObj: LogObject) {
		const output = formatLogOutput(logObj);
		console.error(output);
	}
}

// Base logger factory class
abstract class BaseLoggerFactory implements LoggerFactory {
	protected readonly instance;

	constructor(reporter: ConsolaReporter) {
		this.instance = defaultInstance.create({
			reporters: [
				reporter,
			],
		});
	}

	create = (...components: string[]): Logger => {
		const id = createLoggerId(...components);
		const logger = this.instance.withTag(id);
		return logger as Logger;
	};
}

@injectable()
export class DrivenLoggerFactoryConsolaBrowser extends BaseLoggerFactory {
	constructor() {
		super(new FancyBrowserReporter());
	}

	static setupContainer(container: Container, serviceIdentifier: symbol): void {
		container
			.bind<LoggerFactory>(serviceIdentifier)
			.to(DrivenLoggerFactoryConsolaBrowser);
	}
}

@injectable()
export class DrivenLoggerFactoryConsolaError extends BaseLoggerFactory {
	constructor() {
		super(new FancyErrorReporter());
	}

	static setupContainer(container: Container, serviceIdentifier: symbol): void {
		container
			.bind<LoggerFactory>(serviceIdentifier)
			.to(DrivenLoggerFactoryConsolaError);
	}
}
