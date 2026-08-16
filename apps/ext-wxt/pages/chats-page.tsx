import { useParams } from "react-router";
import { SessionListScreen } from "@/components/screens/session-list-screen";
import { mockActiveSessionId, mockSessions } from "@/mocks/agent-fixtures";
import { hrefs } from "@/routes/paths";

/** The list of chats. */
export const ChatsPage = () => {
	const { sessionId = mockActiveSessionId } = useParams();

	return (
		<SessionListScreen
			sessions={mockSessions}
			activeSessionId={sessionId}
			backHref={hrefs.chat(sessionId)}
			hrefForSession={hrefs.chat}
		/>
	);
};
