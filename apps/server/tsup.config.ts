import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(
	readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
	version: string;
};

export default defineConfig({
	entry: [
		"src/main.ts",
	],
	define: {
		// biome-ignore lint/style/useNamingConvention: build-time global constant
		__MBK_SERVER_VERSION__: JSON.stringify(version),
	},
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
