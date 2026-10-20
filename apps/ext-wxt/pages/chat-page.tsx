import ChatIcon from "@mui/icons-material/Chat";
import Button from "@mui/material/Button";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { EmptyState } from "@/components/elements/empty-state";
import { ChatThreadScreen } from "@/components/screens/chat-thread-screen";
import { useAgentSessions, useAgentThread } from "@/hooks/use-agent";
import { hrefs } from "@/routes/paths";

/**
 * One chat thread. Serves both `/` (opening the newest session, creating one if
 * there is none) and `/chats/:sessionId`.
 */
export const ChatPage = () => {
	const { sessionId } = useParams();
	const navigate = useNavigate();
	const { sessions, createSession } = useAgentSessions();
	const { session, items, typing, hydrated, error, sendMessage, cancel } =
		useAgentThread(sessionId);
	const [draft, setDraft] = useState("");

	// Wait for `sessions` so a duplicate isn't created before the first read.
	useEffect(() => {
		if (sessionId || !sessions) {
			return;
		}
		const newest = [
			...sessions,
		].sort((a, b) => b.updatedAt - a.updatedAt)[0];
		if (newest) {
			void navigate(hrefs.chat(newest.sessionId).slice(1), {
				replace: true,
			});
			return;
		}
		void createSession().then((created) =>
			navigate(hrefs.chat(created.sessionId).slice(1), {
				replace: true,
			}),
		);
	}, [
		sessionId,
		sessions,
		createSession,
		navigate,
	]);

	if (!(session || hydrated)) {
		return (
			<EmptyState
				icon={<ChatIcon fontSize="inherit" />}
				title="Loading chat…"
			/>
		);
	}

	if (!session) {
		return (
			<EmptyState
				icon={<ChatIcon fontSize="inherit" />}
				title="This chat is no longer available"
				description="The extension's background worker restarts when idle, which clears in-memory sessions."
				action={
					<Button
						size="small"
						onClick={() => {
							void createSession().then((created) =>
								navigate(hrefs.chat(created.sessionId).slice(1), {
									replace: true,
								}),
							);
						}}
					>
						Start a new chat
					</Button>
				}
			/>
		);
	}

	return (
		<ChatThreadScreen
			session={session}
			items={items}
			typing={typing}
			// Tool detail rows start collapsed; expansion is local to the row.
			expandedToolIds={[]}
			draft={draft}
			chatsHref={hrefs.chats}
			settingsHref={hrefs.settings}
			error={error}
			onDraftChange={setDraft}
			onSend={() => {
				const content = draft;
				setDraft("");
				void sendMessage(content);
			}}
			onStop={() => {
				void cancel();
			}}
		/>
	);
};
