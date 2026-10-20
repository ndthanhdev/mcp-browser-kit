import "core-js/proposals";
import {
	BrowserDriverOutputPort,
	FeatureFlagsOutputPort,
} from "@mcp-browser-kit/core-extension";
import {
	AgentPortGate,
	ExtensionDrivingAgentRpc,
} from "@mcp-browser-kit/extension-driving-agent-rpc";
import { composeAgentContainer } from "@/utils/compose-agent-container";

/**
 * The toolbar-button APIs used below, declared locally because the
 * `@wxt-dev/browser` version `wxt` resolves predates `sidePanel` and never
 * covered Firefox's `sidebarAction`.
 */
interface ToolbarApis {
	sidePanel?: {
		setPanelBehavior(behavior: {
			openPanelOnActionClick: boolean;
		}): Promise<void>;
	};
	sidebarAction?: {
		toggle(): Promise<void>;
	};
	action?: {
		onClicked: {
			addListener(callback: () => void): void;
		};
	};
	browserAction?: {
		onClicked: {
			addListener(callback: () => void): void;
		};
	};
}

/**
 * Make the toolbar button open the sidepanel.
 *
 * Chromium handles this declaratively once the behaviour is set — no click
 * listener needed. Firefox has no equivalent, so toggle its sidebar from the
 * action click, which counts as the user gesture `toggle()` requires. The
 * Firefox target builds as MV2, where the action API is `browserAction`.
 */
const openSidepanelOnActionClick = () => {
	const { sidePanel, sidebarAction, action, browserAction } =
		browser as ToolbarApis;

	if (sidePanel) {
		void sidePanel
			.setPanelBehavior({
				openPanelOnActionClick: true,
			})
			.catch((error: unknown) => {
				console.error("Failed to open the sidepanel on action click", error);
			});
		return;
	}

	const toolbarButton = action ?? browserAction;
	if (!(sidebarAction && toolbarButton)) {
		return;
	}

	toolbarButton.onClicked.addListener(() => {
		void sidebarAction.toggle();
	});
};

/**
 * Compose the extension hexagon and expose the agent to the sidepanel.
 *
 * The agent lives here because the background is the only context that owns
 * the browser driver and survives tab navigation and the sidepanel closing.
 */
const startAgent = async (gate: AgentPortGate) => {
	const container = composeAgentContainer(
		import.meta.env.MANIFEST_VERSION === 3 ? 3 : 2,
	);

	const featureFlags = container.get<FeatureFlagsOutputPort>(
		FeatureFlagsOutputPort,
	);
	await featureFlags.start();

	if (!(await featureFlags.getBooleanValue("browser-agent"))) {
		gate.refuse();
		return;
	}

	// Content-script tool calls fail with "MessageChannel not initialized"
	// until this runs.
	container.get<BrowserDriverOutputPort>(BrowserDriverOutputPort).linkRpc();
	container.get<ExtensionDrivingAgentRpc>(ExtensionDrivingAgentRpc).start(gate);
};

/**
 * `type: "module"` makes `import()` available in the MV3 service worker, so the
 * LLM provider packages load lazily instead of being re-parsed on every wake.
 * The Firefox MV2 build is a classic script; WXT inlines it there instead.
 */
export default defineBackground({
	type: "module",
	main() {
		openSidepanelOnActionClick();

		// Must be constructed before any `await`: MV3 only delivers `onConnect`
		// to listeners registered during the worker's initial evaluation.
		const gate = new AgentPortGate();

		void startAgent(gate).catch((error: unknown) => {
			console.error("Failed to start the browser agent", error);
			gate.refuse();
		});
	},
});
