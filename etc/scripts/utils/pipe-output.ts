import type { ProcessPromise } from "zx";

export const pipeOutput = (po: ProcessPromise) => {
	const poSilent = po.quiet();
	poSilent.stderr.pipe(process.stderr);
	poSilent.stdout.pipe(process.stdout);

	return poSilent;
};
