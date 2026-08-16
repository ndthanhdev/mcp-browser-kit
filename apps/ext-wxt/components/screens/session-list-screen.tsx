import type { AgentSession } from "@mcp-browser-kit/core-extension";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ForumIcon from "@mui/icons-material/Forum";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@/components/elements/empty-state";
import { SessionListItem } from "@/components/fragments/session-list-item";

export interface SessionListScreenProps {
	sessions: AgentSession[];
	activeSessionId: string;
	/** Anchor target for the back arrow. */
	backHref: string;
	/** Builds the anchor target for each chat row. */
	hrefForSession: (sessionId: string) => string;
}

/** Full-panel list of chats, reached from the thread screen's chats button. */
export const SessionListScreen = ({
	sessions,
	activeSessionId,
	backHref,
	hrefForSession,
}: SessionListScreenProps) => (
	<>
		<AppBar position="static" color="default" elevation={0}>
			<Toolbar
				variant="dense"
				sx={{
					gap: 1,
				}}
			>
				<IconButton
					edge="start"
					color="inherit"
					component="a"
					href={backHref}
					aria-label="Back to chat"
				>
					<ArrowBackIcon />
				</IconButton>
				<Typography
					variant="subtitle2"
					sx={{
						flexGrow: 1,
					}}
				>
					Chats
				</Typography>
				<Tooltip title="New chat">
					<IconButton edge="end" color="inherit">
						<AddIcon />
					</IconButton>
				</Tooltip>
			</Toolbar>
		</AppBar>

		{sessions.length === 0 ? (
			<EmptyState
				icon={<ForumIcon fontSize="inherit" />}
				title="No chats yet"
				description="Start one to have the agent work on the current tab."
			/>
		) : (
			<List
				dense
				disablePadding
				sx={{
					flex: 1,
					overflowY: "auto",
				}}
			>
				{sessions.map((session) => (
					<SessionListItem
						key={session.sessionId}
						session={session}
						selected={session.sessionId === activeSessionId}
						href={hrefForSession(session.sessionId)}
					/>
				))}
			</List>
		)}
	</>
);
