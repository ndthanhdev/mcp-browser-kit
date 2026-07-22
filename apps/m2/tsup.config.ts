import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/bootstrap-extension-tab.ts",
		"src/bootstrap-extension.ts",
	],
	splitting: false,
	sourcemap: true,
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
