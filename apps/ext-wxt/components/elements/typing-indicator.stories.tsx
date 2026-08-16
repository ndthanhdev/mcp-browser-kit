import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypingIndicator } from "./typing-indicator";

const meta = {
	title: "ext-wxt/elements/TypingIndicator",
	component: TypingIndicator,
} satisfies Meta<typeof TypingIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
