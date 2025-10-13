import type { Logger, LoggerFactory } from "@mcp-browser-kit/types";
import * as changeCase from "change-case";
import type { ConsolaReporter, LogObject } from "consola";
import { consola, createConsola, LogLevels } from "consola";
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

// Enhanced reporter with fancy formatting for browser console
class FancyBrowserReporter implements ConsolaReporter {
	log(logObj: LogObject) {
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

		const output = isBadge ? `\n${line}\n` : line;

		// Use appropriate console method based on log level/type
		switch (logObj.type) {
			case "error":
			case "fatal":
			case "fail":
				console.error(output);
				break;
			case "warn":
				console.warn(output);
				break;
			case "info":
			case "success":
			case "ready":
				console.info(output);
				break;
			case "debug":
			case "trace":
				console.debug(output);
				break;
			default:
				console.log(output);
		}
	}
}

// Enhanced reporter with fancy formatting for error output only
class FancyErrorReporter implements ConsolaReporter {
	log(logObj: LogObject) {
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

		const output = isBadge ? `\n${line}\n` : line;
		console.error(output);
	}
}

@injectable()
export class DrivenLoggerFactoryConsolaBrowser implements LoggerFactory {
	private readonly instance;
	constructor() {
		this.instance = defaultInstance.create({
			reporters: [
				new FancyBrowserReporter(),
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
export class DrivenLoggerFactoryConsolaError implements LoggerFactory {
	private readonly instance;
	constructor() {
		this.instance = defaultInstance.create({
			reporters: [
				new FancyErrorReporter(),
			],
		});
	}

	create = (...components: string[]): Logger => {
		const id = createLoggerId(...components);

		const logger = this.instance.withTag(id);

		return logger as Logger;
	};
}
