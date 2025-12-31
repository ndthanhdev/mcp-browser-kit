import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/bootstrap-mbk-tab.ts",
		"src/bootstrap-mbk-bg.ts",
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
	target: "firefox145",
	platform: "browser",
	outDir: "target/tsup/dist",
});
