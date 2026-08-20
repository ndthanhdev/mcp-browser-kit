import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { CopilotSignInState } from "@/hooks/use-agent-settings";

export interface CopilotSignInCardProps {
	state: CopilotSignInState;
	/** GitHub login of the signed-in account, if any. */
	login?: string;
	signedIn: boolean;
	onSignIn: () => void;
	onCancel: () => void;
	onSignOut: () => void;
}

/**
 * The GitHub device-flow panel.
 *
 * The user code is the whole point of the awaiting state, so it is rendered
 * large and monospaced with a copy button — the flow fails if it is mistyped,
 * and the codes contain characters that are easy to confuse.
 */
export const CopilotSignInCard = ({
	state,
	login,
	signedIn,
	onSignIn,
	onCancel,
	onSignOut,
}: CopilotSignInCardProps) => {
	if (state.status === "awaiting-authorization") {
		const { userCode, verificationUri } = state.grant;
		return (
			<Stack spacing={1.5}>
				<Typography variant="body2" color="text.secondary">
					Enter this code on GitHub to authorize the extension:
				</Typography>
				<Stack
					direction="row"
					spacing={1}
					sx={{
						alignItems: "center",
					}}
				>
					<Box
						sx={{
							fontFamily: "monospace",
							fontSize: "1.4rem",
							letterSpacing: "0.2em",
							px: 1.5,
							py: 1,
							borderRadius: 1,
							bgcolor: "action.hover",
						}}
					>
						{userCode}
					</Box>
					<Tooltip title="Copy code">
						<IconButton
							aria-label="Copy code"
							onClick={() => {
								void navigator.clipboard.writeText(userCode);
							}}
						>
							<ContentCopyIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Stack>
				<Button
					variant="contained"
					size="small"
					endIcon={<OpenInNewIcon />}
					component="a"
					href={verificationUri}
					target="_blank"
					rel="noreferrer"
				>
					Open GitHub
				</Button>
				<Stack
					direction="row"
					spacing={1}
					sx={{
						alignItems: "center",
					}}
				>
					<CircularProgress size={16} />
					<Typography variant="caption" color="text.secondary">
						Waiting for authorization…
					</Typography>
					<Button size="small" onClick={onCancel}>
						Cancel
					</Button>
				</Stack>
			</Stack>
		);
	}

	return (
		<Stack spacing={1.5}>
			{state.status === "failed" ? (
				<Alert severity="error">{state.message}</Alert>
			) : null}
			{signedIn ? (
				<Stack
					direction="row"
					spacing={1}
					sx={{
						alignItems: "center",
					}}
				>
					<Typography
						variant="body2"
						sx={{
							flexGrow: 1,
						}}
					>
						Signed in{login ? ` as ${login}` : ""}
					</Typography>
					<Button size="small" onClick={onSignOut}>
						Sign out
					</Button>
				</Stack>
			) : (
				<Button
					variant="contained"
					size="small"
					disabled={state.status === "starting"}
					onClick={onSignIn}
					sx={{
						alignSelf: "flex-start",
					}}
				>
					{state.status === "starting" ? "Starting…" : "Sign in with GitHub"}
				</Button>
			)}
		</Stack>
	);
};
