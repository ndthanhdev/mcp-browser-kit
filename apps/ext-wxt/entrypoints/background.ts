import "core-js/proposals";
import {
	FeatureFlagsOutputPort,
	LlmProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLlmProvider } from "@mcp-browser-kit/extension-driven-llm-provider";
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
 * The agent has to live here rather than in the sidepanel: the background is the
 * only context that owns the browser driver and survives both tab navigation and
 * the sidepanel being closed mid-turn.
 */
const startAgent = async (gate: AgentPortGate) => {
	// Built by `composeAgentContainer` so the graph the tests resolve is the
	// graph that ships. WXT inlines `MANIFEST_VERSION`, so the unused driver is
	// still tree-shaken.
	const container = composeAgentContainer(
		import.meta.env.MANIFEST_VERSION === 3 ? 3 : 2,
	);

	const featureFlags = container.get<FeatureFlagsOutputPort>(
		FeatureFlagsOutputPort,
	);
	await featureFlags.start();

	if (!(await featureFlags.getBooleanValue("browser-agent"))) {
		// Close any waiting sidepanel connection rather than leaving it hanging.
		gate.refuse();
		return;
	}

	// Warm the models.dev catalog so the settings picker has something to show.
	// Failure is not fatal — the registry falls back to a cached copy, and the
	// settings page surfaces the error and offers a retry.
	const llmProvider = container.get<LlmProviderOutputPort>(
		LlmProviderOutputPort,
	);
	if (llmProvider instanceof DrivenLlmProvider) {
		void llmProvider.catalog.refreshIfStale().catch((error: unknown) => {
			console.warn("Could not refresh the models.dev catalog", error);
		});
	}

	container.get<ExtensionDrivingAgentRpc>(ExtensionDrivingAgentRpc).start(gate);
};

/**
 * `type: "module"` is not cosmetic — it is what makes `import()` available in
 * the service worker, and therefore what lets the LLM provider packages load
 * lazily instead of being parsed on every wake.
 *
 * That matters because MV3 evicts an idle worker after ~30s and re-parses it on
 * the next wake, and this worker wakes on every sidepanel open and every agent
 * turn. Bundling the provider SDKs eagerly would put ~500 KB of code on that
 * path for a user who only ever talks to one provider.
 *
 * Firefox builds MV2, where the background is a classic script that cannot
 * `import()`. WXT already handles this: it emits a single inlined
 * `background.js` with no chunk references for that target, so the same source
 * degrades to eager loading. MV2 background pages are persistent, so the parse
 * cost is paid once and the loss doesn't matter.
 */
export default defineBackground({
	type: "module",
	main() {
		openSidepanelOnActionClick();

		// Constructed synchronously, before any `await`. MV3 only delivers
		// `onConnect` to listeners registered during the worker's initial
		// evaluation, and the connection that wakes the worker is dispatched while
		// composition below is still suspended — so without this the sidepanel's
		// very first connect is dropped and its calls never resolve.
		const gate = new AgentPortGate();

		void startAgent(gate).catch((error: unknown) => {
			console.error("Failed to start the browser agent", error);
			// Don't strand the sidepanel: let its calls fail with an error it can
			// show, rather than waiting on an agent that will never arrive.
			gate.refuse();
		});
	},
});
