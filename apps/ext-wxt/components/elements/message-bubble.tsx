import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export interface MessageBubbleProps {
	content: string;
	/** Right-aligned and filled when true; left-aligned and outlined when not. */
	fromUser: boolean;
}

/** A single chat bubble. */
export const MessageBubble = ({ content, fromUser }: MessageBubbleProps) => (
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
				px: 1.5,
				py: 1,
				borderRadius: 2,
				bgcolor: fromUser ? "primary.main" : "brand.surfaceElevated",
				color: fromUser ? "primary.contrastText" : "text.primary",
			}}
		>
			<Typography
				variant="body2"
				sx={{
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
			>
				{content}
			</Typography>
		</Paper>
	</Box>
);
