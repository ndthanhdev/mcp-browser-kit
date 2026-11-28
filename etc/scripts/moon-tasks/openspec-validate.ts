#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";

$.verbose = true;
cd(workDirs.path);

await pipeOutput($`yarn openspec validate --all --strict --no-interactive`);
await pipeOutput($`yarn openspec validate --archived --no-interactive`);

const activeChanges = await $`yarn openspec list --json`.quiet();
const { changes } = activeChanges.json<{
	changes: {
		name: string;
	}[];
}>();

if (changes.length > 0) {
	echo(chalk.red("Archive these OpenSpec changes before merging:"));
	for (const { name } of changes) {
		echo(chalk.red(`  - ${name}`));
	}
	echo("Run `yarn openspec archive <change-name>` for each one.");
	process.exit(1);
}
