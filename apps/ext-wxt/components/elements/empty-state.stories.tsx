import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./empty-state";

const meta = {
	title: "ext-wxt/elements/EmptyState",
	component: EmptyState,
	// EmptyState is `flex: 1` and centres itself, so it needs a sized flex parent
	// to look like it does inside the sidepanel.
	decorators: [
		(Story) => (
			<Box
				sx={{
					display: "flex",
					width: 360,
					height: 320,
				}}
			>
				<Story />
			</Box>
		),
	],
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
	args: {
		icon: <ChatBubbleOutlineIcon fontSize="inherit" />,
		title: "No conversations yet",
	},
};

export const WithDescription: Story = {
	args: {
		icon: <ChatBubbleOutlineIcon fontSize="inherit" />,
		title: "No conversations yet",
		description: "Start a chat to control this browser from your assistant.",
	},
};

export const WithAction: Story = {
	args: {
		icon: <SearchOffIcon fontSize="inherit" />,
		title: "No matching sessions",
		description: "Try a different search, or start a new session.",
		action: (
			<Button size="small" variant="contained">
				New session
			</Button>
		),
	},
};
