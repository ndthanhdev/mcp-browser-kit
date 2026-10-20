import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { MarkdownContent } from "@/components/elements/markdown-content";

export interface MessageBubbleProps {
	content: string;
	/**
	 * Right-aligned, filled, and shown verbatim when true; left-aligned,
	 * outlined, and rendered as Markdown when not.
	 */
	fromUser: boolean;
	/** Marks assistant text that is still arriving. */
	streaming?: boolean;
}

/** A single chat bubble. */
export const MessageBubble = ({
	content,
	fromUser,
	streaming,
}: MessageBubbleProps) => (
	<Box
		sx={{
			display: "flex",
			justifyContent: fromUser ? "flex-end" : "flex-start",
		}}
	>
		<Paper
			variant={fromUser ? "elevation" : "outlined"}
			elevation={fromUser ? 0 : undefined}
			sx={{
				maxWidth: "85%",
				minWidth: 0,
				px: 1.5,
				py: 1,
				borderRadius: 2,
				bgcolor: fromUser ? "primary.main" : "brand.surfaceElevated",
				color: fromUser ? "primary.contrastText" : "text.primary",
			}}
		>
			{fromUser ? (
				<Typography
					variant="body2"
					sx={{
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}
				>
					{content}
				</Typography>
			) : (
				<MarkdownContent content={content} streaming={streaming} />
			)}
		</Paper>
	</Box>
);
