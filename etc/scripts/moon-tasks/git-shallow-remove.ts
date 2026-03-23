#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";

$.verbose = true;
cd(workDirs.path);

if (fs.existsSync(".git/shallow")) {
	console.warn(
		"Warning: .git/shallow exists, deleting it. This may be because CI failed to remove it previously. Make sure to fully cloned the repo.",
	);
	await $`rm -rf .git/shallow`;
}
