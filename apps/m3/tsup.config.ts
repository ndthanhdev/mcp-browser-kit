import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/mbk-content.ts", "src/mbk-sw.ts"],
	splitting: false,
	sourcemap: true,
	clean: true,
	format: ["esm"],
	noExternal: [/.+/],
	target: "chrome135",
	outDir: "build/tsup/dist",
});
