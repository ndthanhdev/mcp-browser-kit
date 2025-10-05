import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/main.ts",
	],
	splitting: false,
	sourcemap: true,
	clean: true,
	format: [
		"esm",
	],
	target: "node22",
	noExternal: [],
	outDir: "target/tsup/dist",
});
