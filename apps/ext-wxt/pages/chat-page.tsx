import { useParams } from "react-router";
import { ChatThreadScreen } from "@/components/screens/chat-thread-screen";
import { RouteErrorScreen } from "@/components/screens/route-error-screen";
import {
	mockActiveSessionId,
	mockSessions,
	mockThreadStates,
	mockThreads,
} from "@/mocks/agent-fixtures";
import { hrefs } from "@/routes/paths";

/**
 * One chat thread. Serves both `/` (falling back to the default session) and
 * `/chats/:sessionId`.
 */
export const ChatPage = () => {
	const { sessionId = mockActiveSessionId } = useParams();

	const session = mockSessions.find((item) => item.sessionId === sessionId);
	if (!session) {
		return <RouteErrorScreen />;
	}

	const threadState = mockThreadStates[session.sessionId];

	return (
		<ChatThreadScreen
			session={session}
			items={mockThreads[session.sessionId] ?? []}
			typing={threadState.typing}
			expandedToolIds={threadState.expandedToolIds}
			draft={threadState.draft}
			chatsHref={hrefs.chats}
		/>
	);
};
