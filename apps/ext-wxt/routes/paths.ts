/**
 * The sidepanel's route vocabulary, in the two forms a hash router needs.
 *
 * {@link routePaths} are the patterns the router matches on. {@link hrefs} are
 * what components put in an `href`, fragment-prefixed: under `HashRouter` a
 * plain anchor to `#/chats` is a real navigation — it fires `hashchange`, which
 * the router listens for, without reloading the page. That keeps every
 * component in `components/` free of any router import.
 */

export const routePaths = {
	chats: "/chats",
	chat: "/chats/:sessionId",
} as const;

export const hrefs = {
	home: "#/",
	chats: "#/chats",
	chat: (sessionId: string) => `#/chats/${sessionId}`,
};
