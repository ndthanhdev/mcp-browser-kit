import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

export interface ComposerProps {
	/** A turn is in flight: the composer offers Stop instead of Send. */
	running: boolean;
	/** Text shown in the input. Presentational — nothing edits it. */
	draft: string;
}

/** Bottom-pinned input. Visual only: it holds no state and sends nothing. */
export const Composer = ({ running, draft }: ComposerProps) => (
	<Box
		sx={{
			p: 1,
			borderTop: 1,
			borderColor: "divider",
			bgcolor: "background.paper",
		}}
	>
		<Stack
			direction="row"
			spacing={1}
			sx={{
				alignItems: "flex-end",
			}}
		>
			<TextField
				fullWidth
				multiline
				maxRows={6}
				size="small"
				value={draft}
				placeholder={running ? "Agent is working…" : "Message the agent"}
				disabled={running}
				slotProps={{
					input: {
						readOnly: true,
					},
				}}
			/>
			{running ? (
				<IconButton color="error" aria-label="Stop">
					<StopIcon />
				</IconButton>
			) : (
				<IconButton
					color="primary"
					disabled={draft.trim().length === 0}
					aria-label="Send"
				>
					<SendIcon />
				</IconButton>
			)}
		</Stack>
	</Box>
);
