import "zx/globals";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

$.verbose = true;

// Moon sets this to the workspace root at task runtime; fall back to path
// math so the script still works when run standalone (not via a moon task).
const root =
	process.env.MOON_WORKSPACE_ROOT ??
	path.resolve(import.meta.dirname, "../../../");
const target = path.resolve(root, "target");
const apps = path.resolve(root, "apps");
const m2 = path.resolve(apps, "m2");
const m3 = path.resolve(apps, "m3");
const server = path.resolve(apps, "server");
const etc = path.resolve(root, "etc");
const workflowRuntime = path.resolve(etc, "workflow-runtime");
const scripts = path.resolve(etc, "scripts");
const release = path.resolve(target, "release");
const tmp = path.resolve(root, ".tmp");
const tmpBrowsers = path.resolve(tmp, "browsers");
const tmpPwDl = path.resolve(tmp, "pw-dl");
const tmpPwResolve = path.resolve(tmp, "pw-resolve");

export const workDirs = {
	target: {
		path: target,
		relativePath: path.relative(root, target),
		apps: {
			path: path.resolve(target, "apps"),
		},
		release: {
			path: release,
			relativePath: path.relative(root, release),
		},
	},
	apps: {
		path: apps,
		m2: {
			path: m2,
		},
		m3: {
			path: m3,
		},
		server: {
			path: server,
		},
	},
	etc: {
		path: etc,
		scripts: {
			path: scripts,
		},
		workflowRuntime: {
			path: workflowRuntime,
		},
	},
	tmp: {
		path: tmp,
		browsers: {
			path: tmpBrowsers,
		},
		pwDl: {
			path: tmpPwDl,
		},
		pwResolve: {
			path: tmpPwResolve,
		},
	},
	path: root,
};
