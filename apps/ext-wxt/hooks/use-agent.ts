import type {
	AgentProgressEvent,
	AgentSession,
} from "@mcp-browser-kit/core-extension";
import { AgentRpcClient } from "@mcp-browser-kit/extension-driving-agent-rpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThreadItem } from "@/types/thread-item";
import {
	applyAgentEvent,
	buildThread,
	emptyThread,
	type ThreadState,
} from "@/utils/thread-items";

/**
 * One client per sidepanel document; a client per component would open a port
 * and an agent subscription per component.
 */
const client = new AgentRpcClient();

/** Sessions plus their loading state, for the chats list. */
export const useAgentSessions = () => {
	const [sessions, setSessions] = useState<AgentSession[]>();
	const [error, setError] = useState<string>();

	const refresh = useCallback(async () => {
		try {
			setSessions(await client.listSessions());
			setError(undefined);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
			// `undefined` means "still loading" to callers.
			setSessions((current) => current ?? []);
		}
	}, []);

	useEffect(() => {
		void refresh();

		const unsubscribe = client.subscribe((event) => {
			if (
				event.type === "session-created" ||
				event.type === "session-updated" ||
				event.type === "session-ended"
			) {
				void refresh();
			}
		});
		// The background may have restarted and lost every session.
		const unsubscribeReconnect = client.onReconnect(() => {
			void refresh();
		});

		return () => {
			unsubscribe();
			unsubscribeReconnect();
		};
	}, [
		refresh,
	]);

	const createSession = useCallback(async () => {
		const session = await client.createSession();
		await refresh();
		return session;
	}, [
		refresh,
	]);

	return {
		/** `undefined` until the first read completes. */
		sessions,
		error,
		createSession,
		refresh,
	};
};

/** One session's transcript, hydrated from history then kept live. */
export const useAgentThread = (sessionId: string | undefined) => {
	const [session, setSession] = useState<AgentSession>();
	const [thread, setThread] = useState<ThreadState>(emptyThread);
	const [error, setError] = useState<string>();
	const [hydrated, setHydrated] = useState(false);

	const hydrate = useCallback(async () => {
		if (!sessionId) {
			// Nothing to hydrate at `/`, but this still counts as settled.
			setHydrated(true);
			return;
		}
		setHydrated(false);
		try {
			const [history, current] = await Promise.all([
				client.getHistory(sessionId),
				client.getSession(sessionId),
			]);
			setThread(buildThread(history));
			setSession(current);
			setError(undefined);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setHydrated(true);
		}
	}, [
		sessionId,
	]);

	useEffect(() => {
		void hydrate();
	}, [
		hydrate,
	]);

	useEffect(() => {
		if (!sessionId) {
			return;
		}

		const unsubscribe = client.subscribe((event: AgentProgressEvent) => {
			if (event.sessionId !== sessionId) {
				return;
			}
			if (event.type === "session-updated") {
				setSession(event.session);
				return;
			}
			setThread((current) => applyAgentEvent(current, event));
		});
		const unsubscribeReconnect = client.onReconnect(() => {
			void hydrate();
		});

		return () => {
			unsubscribe();
			unsubscribeReconnect();
		};
	}, [
		sessionId,
		hydrate,
	]);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!(sessionId && content.trim())) {
				return;
			}
			await client.sendMessage({
				sessionId,
				message: {
					content,
				},
			});
		},
		[
			sessionId,
		],
	);

	const cancel = useCallback(async () => {
		if (sessionId) {
			await client.cancel(sessionId);
		}
	}, [
		sessionId,
	]);

	const items: ThreadItem[] = thread.items;

	return {
		session,
		items,
		/** True while a turn is in flight — drives the typing indicator. */
		typing: useMemo(
			() => session?.status === "running",
			[
				session,
			],
		),
		hydrated,
		error,
		sendMessage,
		cancel,
	};
};

export { client as agentClient };
