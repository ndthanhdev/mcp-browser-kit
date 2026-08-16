import { createHashRouter } from "react-router";
import { RouteErrorScreen } from "@/components/screens/route-error-screen";
import { ChatPage } from "@/pages/chat-page";
import { ChatsPage } from "@/pages/chats-page";
import { routePaths } from "@/routes/paths";
import { SidepanelLayout } from "@/routes/sidepanel-layout";

/**
 * Hash routing, not browser routing: the sidepanel is served from a real file
 * at `chrome-extension://<id>/sidepanel.html`, so a pushed path like `/chats`
 * would 404 on reload. A fragment keeps every route loadable.
 */
export const router = createHashRouter([
	{
		element: <SidepanelLayout />,
		errorElement: <RouteErrorScreen />,
		children: [
			{
				index: true,
				element: <ChatPage />,
			},
			{
				path: routePaths.chats,
				element: <ChatsPage />,
			},
			{
				path: routePaths.chat,
				element: <ChatPage />,
			},
			{
				path: "*",
				element: <RouteErrorScreen />,
			},
		],
	},
]);
