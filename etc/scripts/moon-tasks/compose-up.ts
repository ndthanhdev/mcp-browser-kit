#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import {
	getComposeEnv,
	getComposeProject,
	PROMPTFOO_UI_PORT,
} from "@mcp-browser-kit/scripts/utils/compose-env";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";

$.verbose = true;

const composeEnv = await getComposeEnv();
const composeFile = workDirs.etc.docker.compose.path;
const compose = $({
	env: {
		...process.env,
		...composeEnv,
	},
});

await compose`docker compose -f ${composeFile} up --build --detach`;

const published = await compose({
	quiet: true,
})`docker compose -f ${composeFile} port prompt-evals ${String(PROMPTFOO_UI_PORT)}`;
const port = published.stdout.trim().split(":").at(-1) ?? "";

const project = getComposeProject(composeEnv);

console.log(
	[
		`promptfoo UI: http://127.0.0.1:${port}`,
		`shell: docker compose -f ${composeFile} -p ${project} exec prompt-evals bash`,
		"run evals (in the shell): moon run prompt-evals:eval",
		`logs: docker compose -f ${composeFile} -p ${project} logs -f`,
	].join("\n"),
);
