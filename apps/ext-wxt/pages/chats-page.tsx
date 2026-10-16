import { useParams } from "react-router";
import { SessionListScreen } from "@/components/screens/session-list-screen";
import { useAgentSessions } from "@/hooks/use-agent";
import { hrefs } from "@/routes/paths";

/** The list of chats. */
export const ChatsPage = () => {
	const { sessionId = "" } = useParams();
	const { sessions } = useAgentSessions();

	return (
		<SessionListScreen
			sessions={sessions ?? []}
			activeSessionId={sessionId}
			backHref={sessionId ? hrefs.chat(sessionId) : hrefs.home}
			hrefForSession={hrefs.chat}
		/>
	);
};
