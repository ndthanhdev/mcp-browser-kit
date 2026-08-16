import type { AgentSession } from "@mcp-browser-kit/core-extension";
import ForumIcon from "@mui/icons-material/Forum";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Composer } from "@/components/fragments/composer";
import { MessageList } from "@/components/fragments/message-list";
import type { ThreadItem } from "@/types/thread-item";

export interface ChatThreadScreenProps {
	session: AgentSession;
	items: ThreadItem[];
	typing: boolean;
	expandedToolIds: string[];
	draft: string;
	/** Anchor target for the chats button. */
	chatsHref: string;
}

/** The default sidepanel screen: one session's transcript plus its composer. */
export const ChatThreadScreen = ({
	session,
	items,
	typing,
	expandedToolIds,
	draft,
	chatsHref,
}: ChatThreadScreenProps) => (
	<>
		<AppBar position="static" color="default" elevation={0}>
			<Toolbar
				variant="dense"
				sx={{
					gap: 1,
				}}
			>
				<Tooltip title="Chats">
					<IconButton
						edge="start"
						color="inherit"
						component="a"
						href={chatsHref}
						aria-label="Chats"
					>
						<ForumIcon />
					</IconButton>
				</Tooltip>
				<Typography
					variant="subtitle2"
					noWrap
					sx={{
						flexGrow: 1,
					}}
				>
					{session.title ?? "New chat"}
				</Typography>
			</Toolbar>
		</AppBar>

		<Box
			sx={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<MessageList
				items={items}
				typing={typing}
				expandedToolIds={expandedToolIds}
			/>
		</Box>

		<Composer running={session.status === "running"} draft={draft} />
	</>
);
