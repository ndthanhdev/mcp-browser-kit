#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { pipeOutput } from "@mcp-browser-kit/scripts/utils/pipe-output";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
$.verbose = true;
cd(workDirs.path);

await pipeOutput($`moon ci`);

await pipeOutput($`moon :check`);
