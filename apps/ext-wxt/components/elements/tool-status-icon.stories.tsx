import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToolStatusIcon } from "./tool-status-icon";

const meta = {
	title: "ext-wxt/elements/ToolStatusIcon",
	component: ToolStatusIcon,
	argTypes: {
		ok: {
			control: "boolean",
		},
	},
} satisfies Meta<typeof ToolStatusIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `ok` is undefined while the tool call is still in flight. */
export const Pending: Story = {
	args: {
		ok: undefined,
	},
};

export const Succeeded: Story = {
	args: {
		ok: true,
	},
};

export const Failed: Story = {
	args: {
		ok: false,
	},
};
