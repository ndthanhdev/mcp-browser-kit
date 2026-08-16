import type {
	AgentSession,
	AgentSessionStatus,
} from "@mcp-browser-kit/core-extension";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { relativeTime } from "@/utils/relative-time";

export interface SessionListItemProps {
	session: AgentSession;
	selected: boolean;
	/** Anchor target for this chat's thread. */
	href: string;
}

const statusColor: Record<
	AgentSessionStatus,
	"default" | "info" | "error" | "success"
> = {
	idle: "default",
	running: "info",
	error: "error",
	ended: "success",
};

/**
 * One chat in the list. The overflow button is a visual affordance only — an
 * MUI `Menu` needs a live `anchorEl`, which cannot come from a prop, so no
 * menu is rendered.
 */
export const SessionListItem = ({
	session,
	selected,
	href,
}: SessionListItemProps) => (
	<ListItemButton selected={selected} dense component="a" href={href}>
		<ListItemText
			primary={
				<Typography variant="body2" noWrap>
					{session.title ?? "New chat"}
				</Typography>
			}
			secondary={
				<Stack
					component="span"
					direction="row"
					spacing={0.5}
					sx={{
						alignItems: "center",
					}}
				>
					{session.status === "idle" ? null : (
						<Chip
							label={session.status}
							size="small"
							color={statusColor[session.status]}
							variant="outlined"
						/>
					)}
					<Typography variant="caption" color="text.secondary">
						{relativeTime(session.updatedAt, Date.now())}
					</Typography>
				</Stack>
			}
		/>
		<IconButton edge="end" size="small" aria-label="Chat actions">
			<MoreVertIcon fontSize="small" />
		</IconButton>
	</ListItemButton>
);
