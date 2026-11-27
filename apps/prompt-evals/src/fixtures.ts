import type {
	ExtensionContext,
	ExtensionTabInfo,
	ExtensionToolName,
	ReadableElementRecord,
} from "@mcp-browser-kit/core-extension";

const SERVER_VERSION = "10.1.0";
const BROWSER_ID = "k7Qm2x";
const WINDOW_ID = "1701";

const githubTab: ExtensionTabInfo = {
	id: "1842",
	windowId: WINDOW_ID,
	url: "https://github.com/login",
	title: "Sign in to GitHub",
	active: true,
};

const mdnTab: ExtensionTabInfo = {
	id: "1845",
	windowId: WINDOW_ID,
	url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
	title: "Fetch API - Web APIs | MDN",
	active: false,
};

const shopTab: ExtensionTabInfo = {
	id: "1851",
	windowId: WINDOW_ID,
	url: "https://shop.example.com/",
	title: "Example Shop",
	active: false,
};

const tabs = [
	githubTab,
	mdnTab,
	shopTab,
];

const toMcpTab = (tab: ExtensionTabInfo) => ({
	...tab,
	tabUri: `bk:///browsers/${BROWSER_ID}/tabs/${tab.id}`,
});

const mcpBrowser = (manifestVersion: 2 | 3) => ({
	serverVersion: SERVER_VERSION,
	browsers: [
		{
			browserId: BROWSER_ID,
			extensionInfo: {
				manifestVersion,
				extensionVersion: SERVER_VERSION,
			},
			tabs: tabs.map(toMcpTab),
		},
	],
});

/** `getContext` payloads as the MCP server returns them. */
export const mcpContexts = {
	mv2: mcpBrowser(2),
	mv3: mcpBrowser(3),
	mismatch: {
		serverVersion: SERVER_VERSION,
		browsers: [
			{
				browserId: BROWSER_ID,
				extensionInfo: {
					manifestVersion: 3,
					extensionVersion: "9.4.0",
				},
				versionMismatch: {
					update: "extension",
					message:
						"The MCP Browser Kit extension (9.4.0) is older than the server (10.1.0). Update the extension to continue.",
				},
				tabs: [
					toMcpTab(githubTab),
				],
			},
		],
	},
};

const MV2_TOOLS: ExtensionToolName[] = [
	"captureTab",
	"savePage",
	"clickOnCoordinates",
	"clickOnElement",
	"closeTab",
	"scrollPage",
	"scrollElement",
	"fillTextToCoordinates",
	"fillTextToElement",
	"loadTabContext",
	"getReadableElements",
	"getReadableText",
	"getElementHtml",
	"getSelection",
	"hitEnterOnCoordinates",
	"hitEnterOnElement",
	"showHumanHint",
	"invokeJsFn",
	"getExtensionContext",
	"openTab",
];

const MV3_BLOCKED_TOOLS = new Set<ExtensionToolName>([
	"captureTab",
	"invokeJsFn",
	"clickOnCoordinates",
	"fillTextToCoordinates",
	"hitEnterOnCoordinates",
]);

const extensionContext = (manifestVersion: 2 | 3): ExtensionContext => ({
	browserId: BROWSER_ID,
	availableWindows: [
		{
			id: WINDOW_ID,
			focused: true,
		},
	],
	availableTabs: tabs,
	availableTools:
		manifestVersion === 2
			? MV2_TOOLS
			: MV2_TOOLS.filter((tool) => !MV3_BLOCKED_TOOLS.has(tool)),
	extensionInfo: {
		extensionId: "mbk-eval",
		manifestVersion,
		extensionVersion: SERVER_VERSION,
	},
	browserInfo: {
		browserName: "Chrome",
		browserVersion: "142.0",
	},
});

/** `getExtensionContext` payloads as the extension returns them to its agent. */
export const extensionContexts = {
	mv2: extensionContext(2),
	mv3: extensionContext(3),
};

interface ElementsFixture {
	tab: ExtensionTabInfo;
	records: ReadableElementRecord[];
}

export const elements = {
	login: {
		tab: githubTab,
		records: [
			[
				"f1:e1",
				"textbox",
				"Username or email address",
			],
			[
				"f1:e2",
				"textbox",
				"Password",
			],
			[
				"f1:e3",
				"button",
				"Sign in",
			],
			[
				"f1:e4",
				"link",
				"Forgot password?",
			],
			[
				"f1:e5",
				"checkbox",
				"Keep me signed in",
			],
		],
	},
	search: {
		tab: shopTab,
		records: [
			[
				"f1:e1",
				"searchbox",
				"Search products",
				"wireless headphones",
			],
			[
				"f1:e6",
				"region",
				"Search results",
			],
			[
				"f1:e7",
				"link",
				"Next page",
			],
		],
	},
	humanOnly: {
		tab: githubTab,
		records: [
			[
				"f1:e8",
				"checkbox",
				"I'm not a robot",
			],
			[
				"f1:e9",
				"button",
				"Choose file: Resume (PDF)",
			],
			[
				"f1:e10",
				"button",
				"Submit application",
			],
		],
	},
} satisfies Record<string, ElementsFixture>;

export const pageText = {
	[mdnTab.id]:
		"Fetch API. The Fetch API provides an interface for fetching resources (including across the network). It is a more powerful and flexible replacement for XMLHttpRequest. Concepts and usage: call fetch() with a URL to get a Promise that resolves to a Response. Request and Response objects represent the two sides of a network exchange, and Headers holds their HTTP headers. Use AbortController to cancel a request.",
};

export type McpContextFixture = keyof typeof mcpContexts;
export type ExtensionContextFixture = keyof typeof extensionContexts;
export type ElementsFixtureName = keyof typeof elements;
