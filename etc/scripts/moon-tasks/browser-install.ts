#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

// Installs the Playwright-pinned Chromium and Firefox builds into
// PLAYWRIGHT_BROWSERS_PATH. Playwright's own extractor deadlocks on this
// project's btrfs .tmp (worker thread wedges in an uninterruptible write and
// the process becomes unkillable), so we let Playwright resolve the CDN URL,
// download the zip ourselves, and extract with adm-zip (sequential, main-thread,
// preserves the executable bit on the browser binaries).

$.verbose = false;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot =
	process.env.MOON_WORKSPACE_ROOT ?? path.resolve(scriptDir, "../../..");
const browsersPath =
	process.env.PLAYWRIGHT_BROWSERS_PATH ??
	path.join(workspaceRoot, ".tmp", "browsers");
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

const cacheDir = path.join(workspaceRoot, ".tmp", "pw-dl");
await fs.ensureDir(cacheDir);

// `playwright install` starts by pruning "unused" browsers from
// PLAYWRIGHT_BROWSERS_PATH — and it considers our manually-extracted builds
// unused (they lack Playwright's install marker), so it deletes them. We only
// call it to scrape the CDN url, so point it at a throwaway path to keep the
// prune away from the browsers we extract into browsersPath.
const resolveDir = path.join(workspaceRoot, ".tmp", "pw-resolve");

// executablePath() reads PLAYWRIGHT_BROWSERS_PATH, so require after setting it.
const require = createRequire(import.meta.url);
const pw = require("@playwright/test");
const AdmZip = require("adm-zip");

const targets: {
	name: string;
	exec: string;
}[] = [
	{
		name: "chromium",
		exec: pw.chromium.executablePath(),
	},
	{
		name: "firefox",
		exec: pw.firefox.executablePath(),
	},
];

for (const target of targets) {
	if (await fs.pathExists(target.exec)) {
		echo(chalk.green(`✔ ${target.name} already installed`));
		continue;
	}

	// .tmp/browsers/<name>-<rev>/(chrome-linux64|firefox)/<bin> → destDir is <name>-<rev>
	const destDir = path.dirname(path.dirname(target.exec));
	const rev = path.basename(destDir);
	const zipPath = path.join(cacheDir, `${rev}.zip`);

	if (await fs.pathExists(zipPath)) {
		echo(`• using cached ${path.relative(workspaceRoot, zipPath)}`);
	} else {
		const url = await resolveDownloadUrl(target.name);
		echo(`⇣ downloading ${target.name} from ${url}`);
		await downloadTo(url, zipPath);
	}

	echo(
		`⇡ extracting ${target.name} → ${path.relative(workspaceRoot, destDir)}`,
	);
	await extractZip(zipPath, destDir);

	if (!(await fs.pathExists(target.exec))) {
		throw new Error(`extraction did not produce ${target.exec}`);
	}
	echo(chalk.green(`✔ ${target.name} installed`));
}

// Ask Playwright for the CDN url by scraping `playwright install`'s output, then
// kill it BEFORE it downloads — so it never reaches the stalling extraction step.
async function resolveDownloadUrl(name: string): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		const child = spawn(
			"yarn",
			[
				"exec",
				"playwright",
				"install",
				name,
			],
			{
				env: {
					...process.env,
					// biome-ignore lint/style/useNamingConvention: env var name
					PLAYWRIGHT_BROWSERS_PATH: resolveDir,
				},
				detached: true,
			},
		);
		let buffer = "";
		let settled = false;
		const stop = () => {
			try {
				process.kill(-(child.pid as number), "SIGKILL");
			} catch {}
		};
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			stop();
			fn();
		};
		const scan = (chunk: Buffer) => {
			buffer += chunk.toString();
			const match = buffer
				// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI
				.replace(/\x1b\[[0-9;]*m/g, "")
				.match(/from (https?:\/\/\S+?\.zip)/);
			if (match) finish(() => resolve(match[1]));
		};
		child.stdout?.on("data", scan);
		child.stderr?.on("data", scan);
		child.on("error", (err) => finish(() => reject(err)));
		child.on("exit", () =>
			finish(() =>
				reject(new Error(`could not resolve download url for ${name}`)),
			),
		);
		setTimeout(
			() => finish(() => reject(new Error(`timed out resolving ${name} url`))),
			60_000,
		);
	});
}

async function downloadTo(url: string, dest: string): Promise<void> {
	const part = `${dest}.part`;
	const res = await fetch(url);
	if (!res.ok || !res.body) {
		throw new Error(`download failed (${res.status}) for ${url}`);
	}
	await pipeline(Readable.fromWeb(res.body), createWriteStream(part));
	await fs.move(part, dest, {
		overwrite: true,
	});
}

async function extractZip(zip: string, destDir: string): Promise<void> {
	await fs.ensureDir(destDir);
	// keepOriginalPermission restores the executable bit stored in each entry's
	// external attributes, so the extracted browser binaries stay runnable.
	new AdmZip(zip).extractAllTo(
		destDir,
		/* overwrite */ true,
		/* keepOriginalPermission */ true,
	);
}
