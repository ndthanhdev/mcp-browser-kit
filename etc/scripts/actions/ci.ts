#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { collectWorkspaceTargets } from "@mcp-browser-kit/scripts/utils/collect-workspace-targets";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";

$.verbose = true;
cd(workDirs.path);

if (fs.existsSync(".git/shallow")) {
  console.warn(
    "Warning: .git/shallow exists, deleting it. This may be because CI failed to remove it previously. Make sure to fully cloned the repo."
  );
  await $`rm -rf .git/shallow`;
}

await pipeOutput($`moon run scripts:playwright-install`);
await pipeOutput($`moon ci`);

await collectWorkspaceTargets();
