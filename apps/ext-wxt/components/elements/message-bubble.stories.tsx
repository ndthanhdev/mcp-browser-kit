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

/** Long content wraps and preserves newlines rather than overflowing. */
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
