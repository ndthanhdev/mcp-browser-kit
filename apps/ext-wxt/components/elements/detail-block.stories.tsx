import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailBlock } from "./detail-block";

const meta = {
	title: "ext-wxt/elements/DetailBlock",
	component: DetailBlock,
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
} satisfies Meta<typeof DetailBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Strings render verbatim. */
export const StringValue: Story = {
	args: {
		label: "Selector",
		value: "#app > main > button.primary",
	},
};

/** Anything else is pretty-printed as JSON. */
export const ObjectValue: Story = {
	args: {
		label: "Input",
		value: {
			tabId: 42,
			selector: "#submit",
			options: {
				timeoutMs: 5000,
				scrollIntoView: true,
			},
		},
	},
};

/** Wide payloads scroll horizontally instead of stretching the panel. */
export const OverflowingValue: Story = {
	args: {
		label: "Result",
		value:
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	},
};
