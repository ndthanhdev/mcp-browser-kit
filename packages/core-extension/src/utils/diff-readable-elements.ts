import type { ReadableElementRecord } from "../types";

export interface ReadableElementsDiffOptions {
	/** Unchanged lines shown before and after each change. */
	contextLines?: number;
	/** Rendered diff longer than this is dropped and reported as tooLarge. */
	maxChars?: number;
	/** Upper bound on LCS table cells; larger changed regions are tooLarge. */
	maxCells?: number;
}

export interface ReadableElementsDiff {
	changed: boolean;
	added: number;
	removed: number;
	pathsShifted: boolean;
	tooLarge: boolean;
	diff?: string;
}

type Op =
	| {
			kind: "equal";
			before: ReadableElementRecord;
			after: ReadableElementRecord;
	  }
	| {
			kind: "remove";
			before: ReadableElementRecord;
	  }
	| {
			kind: "add";
			after: ReadableElementRecord;
	  };

const DEFAULT_CONTEXT_LINES = 3;
const DEFAULT_MAX_CHARS = 2_000;
const DEFAULT_MAX_CELLS = 4_000_000;

// Identity ignores the path: inserting one element renumbers every later
// sibling, and matching on path would turn that into a wall of changes.
const identity = ([, role, text, value]: ReadableElementRecord): string =>
	JSON.stringify([
		role,
		text,
		value ?? null,
	]);

const renderLine = (sign: string, record: ReadableElementRecord): string =>
	`${sign} ${JSON.stringify(record)}`;

const lcsOps = (
	before: ReadableElementRecord[],
	after: ReadableElementRecord[],
	beforeKeys: string[],
	afterKeys: string[],
): Op[] => {
	const n = before.length;
	const m = after.length;
	const width = m + 1;
	// table[i][j] = LCS length of before[i..] and after[j..]
	const table = new Uint32Array((n + 1) * width);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i * width + j] =
				beforeKeys[i] === afterKeys[j]
					? table[(i + 1) * width + j + 1] + 1
					: Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
		}
	}

	const ops: Op[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (beforeKeys[i] === afterKeys[j]) {
			ops.push({
				kind: "equal",
				before: before[i],
				after: after[j],
			});
			i++;
			j++;
		} else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
			ops.push({
				kind: "remove",
				before: before[i],
			});
			i++;
		} else {
			ops.push({
				kind: "add",
				after: after[j],
			});
			j++;
		}
	}
	for (; i < n; i++)
		ops.push({
			kind: "remove",
			before: before[i],
		});
	for (; j < m; j++)
		ops.push({
			kind: "add",
			after: after[j],
		});
	return ops;
};

const renderHunks = (ops: Op[], contextLines: number): string => {
	const changedIndexes: number[] = [];
	ops.forEach((op, index) => {
		if (op.kind !== "equal") changedIndexes.push(index);
	});

	const ranges: [
		number,
		number,
	][] = [];
	for (const index of changedIndexes) {
		const start = Math.max(0, index - contextLines);
		const end = Math.min(ops.length - 1, index + contextLines);
		const last = ranges.at(-1);
		if (last && start <= last[1] + 1) {
			last[1] = Math.max(last[1], end);
		} else {
			ranges.push([
				start,
				end,
			]);
		}
	}

	const lines: string[] = [];
	for (const [start, end] of ranges) {
		lines.push("@@");
		for (let k = start; k <= end; k++) {
			const op = ops[k];
			if (op.kind === "equal") lines.push(renderLine(" ", op.after));
			else if (op.kind === "remove") lines.push(renderLine("-", op.before));
			else lines.push(renderLine("+", op.after));
		}
	}
	return lines.join("\n");
};

/**
 * Line diff of two readable-element snapshots. Records are matched on
 * role + text + value; rendered lines carry the record's current path so the
 * caller can act on any line in the diff without re-reading.
 */
export const diffReadableElements = (
	before: ReadableElementRecord[],
	after: ReadableElementRecord[],
	options: ReadableElementsDiffOptions = {},
): ReadableElementsDiff => {
	const contextLines = options.contextLines ?? DEFAULT_CONTEXT_LINES;
	const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
	const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;

	const beforeKeys = before.map(identity);
	const afterKeys = after.map(identity);

	let prefix = 0;
	while (
		prefix < before.length &&
		prefix < after.length &&
		beforeKeys[prefix] === afterKeys[prefix]
	) {
		prefix++;
	}
	let suffix = 0;
	while (
		suffix < before.length - prefix &&
		suffix < after.length - prefix &&
		beforeKeys[before.length - 1 - suffix] ===
			afterKeys[after.length - 1 - suffix]
	) {
		suffix++;
	}

	const middleBefore = before.slice(prefix, before.length - suffix);
	const middleAfter = after.slice(prefix, after.length - suffix);

	if (middleBefore.length * middleAfter.length > maxCells) {
		return {
			changed: true,
			added: middleAfter.length,
			removed: middleBefore.length,
			pathsShifted: true,
			tooLarge: true,
		};
	}

	const equalRange = (from: number, to: number, offset: number): Op[] =>
		before.slice(from, to).map((record, k) => ({
			kind: "equal" as const,
			before: record,
			after: after[from + offset + k],
		}));

	const ops: Op[] = [
		...equalRange(0, prefix, 0),
		...lcsOps(
			middleBefore,
			middleAfter,
			beforeKeys.slice(prefix, before.length - suffix),
			afterKeys.slice(prefix, after.length - suffix),
		),
		...equalRange(
			before.length - suffix,
			before.length,
			after.length - before.length,
		),
	];

	let added = 0;
	let removed = 0;
	let pathsShifted = false;
	for (const op of ops) {
		if (op.kind === "add") added++;
		else if (op.kind === "remove") removed++;
		else if (op.before[0] !== op.after[0]) pathsShifted = true;
	}

	if (added === 0 && removed === 0) {
		return {
			changed: false,
			added,
			removed,
			pathsShifted,
			tooLarge: false,
		};
	}

	const diff = renderHunks(ops, contextLines);
	if (diff.length > maxChars) {
		return {
			changed: true,
			added,
			removed,
			pathsShifted,
			tooLarge: true,
		};
	}

	return {
		changed: true,
		added,
		removed,
		pathsShifted,
		tooLarge: false,
		diff,
	};
};
