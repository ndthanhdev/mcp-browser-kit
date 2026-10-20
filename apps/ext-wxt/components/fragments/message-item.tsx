import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { MessageBubble } from "@/components/elements/message-bubble";
import { ToolActivity } from "@/components/fragments/tool-activity";
import type { ThreadItem } from "@/types/thread-item";

export interface MessageItemProps {
	item: ThreadItem;
	/** Only meaningful for tool rows. */
	expanded: boolean;
}

/** Renders a single thread row. */
export const MessageItem = ({ item, expanded }: MessageItemProps) => {
	switch (item.kind) {
		case "user":
			return <MessageBubble content={item.content.trim()} fromUser />;

		case "assistant": {
			// Models often emit blank lines around a tool step. A row with no
			// visible text renders nothing; the typing indicator already covers a
			// turn that is working.
			const content = item.content.trim();
			if (!content) {
				return null;
			}
			return (
				<MessageBubble
					content={content}
					fromUser={false}
					streaming={item.streaming}
				/>
			);
		}

		case "tool":
			return <ToolActivity item={item} expanded={expanded} />;

		case "error":
			return (
				<Alert severity="error" variant="outlined">
					<Typography variant="body2">{item.message}</Typography>
				</Alert>
			);

		case "aborted":
			return (
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
					}}
				>
					<Chip label="Stopped" size="small" variant="outlined" />
				</Box>
			);

		default:
			return null;
	}
};
