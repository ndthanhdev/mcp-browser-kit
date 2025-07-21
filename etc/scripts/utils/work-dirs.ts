import "zx/globals";
// eslint-disable-next-line unicorn/import-style
import * as path from "node:path";

$.verbose = true;

const root = path.resolve(import.meta.dirname, "../../../");
const target = path.resolve(root, "target");
const apps = path.resolve(root, "apps");
const m2 = path.resolve(apps, "m2");
const m3 = path.resolve(apps, "m3");
const server = path.resolve(apps, "server");
const etc = path.resolve(root, "etc");
const workflowRuntime = path.resolve(etc, "workflow-runtime");
const scripts = path.resolve(etc, "scripts");
const release = path.resolve(target, "release");

export const workDirs = {
	target: {
		path: target,
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
	path: root,
};
