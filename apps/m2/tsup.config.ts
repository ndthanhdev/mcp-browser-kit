import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/mbk-tab.ts",
		"src/mbk-background.ts",
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
	target: "chrome135",
	platform: "browser",
	outDir: "target/tsup/dist",
});
