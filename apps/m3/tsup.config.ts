import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/bootstrap-mbk-tab.ts",
		"src/bootstrap-mbk-sw.ts",
	],
	splitting: false,
	sourcemap: "inline",
	clean: true,
	format: [
		"esm",
	],
	noExternal: [
		/.+/,
	],
	target: "chrome135",
	platform: "browser",
	outDir: "target/tsup/dist",
	shims: true,
});
