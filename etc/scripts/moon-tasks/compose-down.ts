#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { getComposeEnv } from "@mcp-browser-kit/scripts/utils/compose-env";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";

$.verbose = true;

const composeEnv = await getComposeEnv();

await $({
	env: {
		...process.env,
		...composeEnv,
	},
})`docker compose -f ${workDirs.etc.docker.compose.path} down`;
