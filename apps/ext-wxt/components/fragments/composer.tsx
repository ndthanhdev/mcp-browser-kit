import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

export interface ComposerProps {
	/** A turn is in flight: the composer offers Stop instead of Send. */
	running: boolean;
	/** Text shown in the input. */
	draft: string;
	onDraftChange: (draft: string) => void;
	onSend: () => void;
	onStop: () => void;
	/** No session yet, or the agent is unreachable. */
	disabled?: boolean;
}

/** Bottom-pinned input for the open thread. */
export const Composer = ({
	running,
	draft,
	onDraftChange,
	onSend,
	onStop,
	disabled = false,
}: ComposerProps) => {
	const canSend = !(running || disabled) && draft.trim().length > 0;

	return (
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
					disabled={running || disabled}
					onChange={(event) => onDraftChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							if (canSend) {
								onSend();
							}
						}
					}}
				/>
				{running ? (
					<IconButton color="error" aria-label="Stop" onClick={onStop}>
						<StopIcon />
					</IconButton>
				) : (
					<IconButton
						color="primary"
						disabled={!canSend}
						aria-label="Send"
						onClick={onSend}
					>
						<SendIcon />
					</IconButton>
				)}
			</Stack>
		</Box>
	);
};
