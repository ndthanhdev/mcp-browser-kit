import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { McpDescriptionsUseCases } from "./mcp-descriptions";

const descriptions = new McpDescriptionsUseCases();

const allInstructionStrings = (): string[] => [
	descriptions.serverInstructions(),
	descriptions.captureTabInstruction(),
	descriptions.clickOnViewableElementInstruction(),
	descriptions.fillTextToViewableElementInstruction(),
	descriptions.hitEnterOnViewableElementInstruction(),
	descriptions.clickOnReadableElementInstruction(),
	descriptions.fillTextToReadableElementInstruction(),
	descriptions.hitEnterOnReadableElementInstruction(),
	descriptions.invokeJsFnInstruction(),
	descriptions.closeTabInstruction(),
	descriptions.getSelectionInstruction(),
	descriptions.openTabInstruction(),
	descriptions.showHumanHintInstruction(),
	descriptions.contextResourceDescription(),
	descriptions.bkResourceTemplateDescription(),
	descriptions.tabReadableTextDescription("tab-1"),
	descriptions.tabReadableElementsDescription("tab-1"),
];

const emojiPattern = /\p{Extended_Pictographic}/u;

describe("McpDescriptionsUseCases", () => {
	it("serverInstructions includes quick-start recipe and response checking", () => {
		const instructions = descriptions.serverInstructions();

		assert.match(instructions, /resources\/read -> bk:\/\/\/context/);
		assert.match(instructions, /structuredContent\.ok/);
		assert.match(
			instructions,
			/readable-elements\/snapshots\/\{snapshotId\}\/pages/,
		);
		assert.match(instructions, /0\.2\.1/);
		assert.ok(
			instructions.length <= 2500,
			`serverInstructions too long (${instructions.length} chars) — may truncate in MCP clients`,
		);
	});

	it("serverInstructions documents MV3 blocked tools", () => {
		const instructions = descriptions.serverInstructions();

		assert.match(instructions, /MV3 blocked: captureTab, invokeJsFn/);
		assert.match(instructions, /avoid coordinate tools/);
	});

	it("element tool instructions describe dot-separated readablePath format", () => {
		const click = descriptions.clickOnReadableElementInstruction();
		const fill = descriptions.fillTextToReadableElementInstruction();

		assert.match(click, /0\.2\.1/);
		assert.match(click, /not a CSS selector/);
		assert.match(fill, /\[path, role, text\]/);
	});

	it("contextResourceDescription points to browsers[].tabs[].tabUri", () => {
		const description = descriptions.contextResourceDescription();

		assert.match(description, /browsers\[\]\.tabs\[\]/);
		assert.match(description, /tabUri/);
	});

	it("bkResourceTemplateDescription uses snapshot-types for pagination", () => {
		const description = descriptions.bkResourceTemplateDescription();

		assert.match(
			description,
			/snapshot-types\/<type>\/snapshots\/<snapshotId>\/pages\/<N>/,
		);
		assert.doesNotMatch(description, /readable-elements\/pages/);
	});

	it("instruction strings contain no emojis", () => {
		for (const text of allInstructionStrings()) {
			assert.doesNotMatch(
				text,
				emojiPattern,
				`unexpected emoji in: ${text.slice(0, 80)}...`,
			);
		}
	});
});
