import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageBubble } from "./message-bubble";

const meta = {
	title: "ext-wxt/elements/MessageBubble",
	component: MessageBubble,
	// The bubble aligns itself within its container, so give it a realistic
	// sidepanel-width parent rather than centring it.
	decorators: [
		(Story) => (
			<Box
				sx={{
					width: 360,
				}}
			>
				<Story />
			</Box>
		),
	],
} satisfies Meta<typeof MessageBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FromUser: Story = {
	args: {
		content: "Open the settings page and tell me which flags are enabled.",
		fromUser: true,
	},
};

export const FromAssistant: Story = {
	args: {
		content: "Two flags are enabled: `chat-ui` and `tool-activity`.",
		fromUser: false,
	},
};

/** Long content wraps rather than overflowing; Markdown lists render as lists. */
export const MultilineFromAssistant: Story = {
	args: {
		content: [
			"I found three matching tabs:",
			"",
			"1. Dashboard — https://example.com/dashboard",
			"2. Settings — https://example.com/settings",
			"3. AVeryLongUnbrokenTokenThatMustWrapSomewhereOtherwiseItOverflows",
		].join("\n"),
		fromUser: false,
	},
};

/** Assistant text is GFM: emphasis, code, links, and tables render. */
export const MarkdownFromAssistant: Story = {
	args: {
		content: [
			'Searched — the tab navigated to Google results for **"hello world"** ([google.com/search?q=hello+world](https://www.google.com/search?q=hello+world)).',
			"",
			"| Result | Domain |",
			"| --- | --- |",
			"| Hello, World! program | wikipedia.org |",
			"",
			"Run `getReadableElements` again to read the page.",
		].join("\n"),
		fromUser: false,
	},
};

/** The caret follows the last block while text is still arriving. */
export const StreamingFromAssistant: Story = {
	args: {
		content: "Looking for the search box on the **current tab**",
		fromUser: false,
		streaming: true,
	},
};

/** User text is shown verbatim, Markdown syntax included. */
export const MarkdownFromUser: Story = {
	args: {
		content: "type **bold** into the box",
		fromUser: true,
	},
};
