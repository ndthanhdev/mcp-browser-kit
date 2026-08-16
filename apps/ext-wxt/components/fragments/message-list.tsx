import ChatBubbleIcon from "@mui/icons-material/ChatBubbleOutlined";
import Stack from "@mui/material/Stack";
import { EmptyState } from "@/components/elements/empty-state";
import { TypingIndicator } from "@/components/elements/typing-indicator";
import { MessageItem } from "@/components/fragments/message-item";
import type { ThreadItem } from "@/types/thread-item";

export interface MessageListProps {
	items: ThreadItem[];
	/** Render the working indicator below the last row. */
	typing: boolean;
	/** Ids of tool rows to render expanded. */
	expandedToolIds: string[];
}

/** Scrollable transcript for one session. */
export const MessageList = ({
	items,
	typing,
	expandedToolIds,
}: MessageListProps) => {
	if (items.length === 0) {
		return (
			<EmptyState
				icon={<ChatBubbleIcon fontSize="inherit" />}
				title="Ask the agent to do something"
				description="It can read the page, click elements and fill in forms on your behalf."
			/>
		);
	}

	return (
		<Stack
			spacing={1.5}
			sx={{
				flex: 1,
				overflowY: "auto",
				p: 1.5,
			}}
		>
			{items.map((item) => (
				<MessageItem
					key={item.id}
					item={item}
					expanded={expandedToolIds.includes(item.id)}
				/>
			))}
			{typing ? <TypingIndicator /> : null}
		</Stack>
	);
};
