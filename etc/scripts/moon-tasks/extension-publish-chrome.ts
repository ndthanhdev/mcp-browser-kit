#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import fse from "fs-extra";
import {
	getChromeClientId,
	getChromeClientSecret,
	getChromeExtensionId,
	getChromeRefreshToken,
	getProjectRoot,
} from "../utils/get-envs";
import { getExtensionName } from "../utils/get-extension-name";

// zx wraps the global `fetch` with a verbose logger that dumps request bodies
// and headers. Those carry the OAuth client secret, the refresh token and the
// bearer access token, so verbose mode stays off here. This script runs no
// shell commands, so nothing else depends on it.
$.verbose = false;
cd(workDirs.path);

const projectRoot = getProjectRoot();
const distDir = path.resolve(projectRoot, "target/extension/dist");
const extensionId = getChromeExtensionId();

const candidates = await glob(`${distDir}/*.zip`);

if (candidates.length === 0) {
	console.error(`No .zip file found in ${distDir}`);
	process.exit(1);
}

// `dist` is not cleaned between builds locally, so pick the freshest zip.
const withMtime = await Promise.all(
	candidates.map(async (filePath) => ({
		filePath,
		mtimeMs: (await fse.stat(filePath)).mtimeMs,
	})),
);
const zipPath = withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs)[0].filePath;

const extensionName = await getExtensionName(projectRoot);
console.log(
	`Publishing ${extensionName} (${zipPath}) to Chrome Web Store item ${extensionId}`,
);

// The Chrome Web Store API returns snake_case fields, which cannot be written as
// literal property accesses without tripping the naming-convention lint.
const readString = (
	record: Record<string, unknown>,
	key: string,
): string | undefined => {
	const value = record[key];
	return typeof value === "string" ? value : undefined;
};

// The Chrome Web Store API only accepts short-lived access tokens, so the
// long-lived refresh token is exchanged for one on every run.
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
	method: "POST",
	headers: {
		"content-type": "application/x-www-form-urlencoded",
	},
	// Tuples rather than an object literal: the OAuth parameter names are
	// snake_case and would violate the naming convention lint as object keys.
	body: new URLSearchParams([
		[
			"client_id",
			getChromeClientId(),
		],
		[
			"client_secret",
			getChromeClientSecret(),
		],
		[
			"refresh_token",
			getChromeRefreshToken(),
		],
		[
			"grant_type",
			"refresh_token",
		],
	]),
});

if (!tokenResponse.ok) {
	console.error(
		`Failed to refresh Chrome Web Store access token (${tokenResponse.status}): ${await tokenResponse.text()}`,
	);
	process.exit(1);
}

const tokenResult = (await tokenResponse.json()) as Record<string, unknown>;
const accessToken = readString(tokenResult, "access_token");

if (!accessToken) {
	console.error("Chrome Web Store token response contained no access_token");
	process.exit(1);
}

const authHeaders = {
	authorization: `Bearer ${accessToken}`,
	"x-goog-api-version": "2",
};

const uploadResponse = await fetch(
	`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}?uploadType=media`,
	{
		method: "PUT",
		headers: authHeaders,
		body: await fse.readFile(zipPath),
	},
);

const uploadBody = await uploadResponse.text();
console.log(`Upload response (${uploadResponse.status}): ${uploadBody}`);

if (!uploadResponse.ok) {
	console.error("Chrome Web Store upload failed");
	process.exit(1);
}

const uploadResult = JSON.parse(uploadBody) as {
	uploadState?: string;
	itemError?: Record<string, unknown>[];
};

if (uploadResult.uploadState === "FAILURE") {
	for (const itemError of uploadResult.itemError ?? []) {
		console.error(
			readString(itemError, "error_detail") ?? JSON.stringify(itemError),
		);
	}
	console.error("Chrome Web Store rejected the uploaded package");
	process.exit(1);
}

const publishResponse = await fetch(
	`https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish?publishTarget=default`,
	{
		method: "POST",
		headers: {
			...authHeaders,
			"content-length": "0",
		},
	},
);

const publishBody = await publishResponse.text();
console.log(`Publish response (${publishResponse.status}): ${publishBody}`);

if (!publishResponse.ok) {
	console.error("Chrome Web Store publish failed");
	process.exit(1);
}

const publishResult = JSON.parse(publishBody) as {
	status?: string[];
	statusDetail?: string[];
};

// `ITEM_PENDING_REVIEW` is the expected outcome for an extension that needs a
// manual permissions review; it means the version was accepted.
const acceptedStatuses = new Set([
	"OK",
	"ITEM_PENDING_REVIEW",
]);
const rejected = (publishResult.status ?? []).filter(
	(status) => !acceptedStatuses.has(status),
);

if (rejected.length > 0) {
	for (const detail of publishResult.statusDetail ?? []) {
		console.error(detail);
	}
	console.error(
		`Chrome Web Store publish returned unexpected status: ${rejected.join(", ")}`,
	);
	process.exit(1);
}

console.log(`Published ${extensionName} to the Chrome Web Store`);
