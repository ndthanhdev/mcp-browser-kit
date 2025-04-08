import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/content.ts", "src/background.ts"],
	splitting: false,
	sourcemap: true,
	clean: true,
	format: ["esm"],
	noExternal: [/.+/],
	target: "chrome135",
	outDir: "build/tsup/dist",
});
