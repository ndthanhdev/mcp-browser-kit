import "core-js/proposals";
import {
	createCoreExtensionContainer,
	FeatureFlagsOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenFeatureFlagsOpenFeatureWeb } from "@mcp-browser-kit/driven-feature-flags/web";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserStateSource } from "@mcp-browser-kit/extension-driven-browser-driver";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/extension-driven-browser-driver/m3";
import type { LlmProviderStrategy } from "@mcp-browser-kit/extension-driven-llm-provider";
import {
	CopilotProvider,
	DrivenLlmProvider,
	LlmProviderStrategyToken,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import { ExtensionDrivingAgentRpc } from "@mcp-browser-kit/extension-driving-agent-rpc";

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
const startAgent = async () => {
	const container = createCoreExtensionContainer();

	DrivenLoggerFactoryConsolaBrowser.setupContainer(
		container,
		LoggerFactoryOutputPort,
	);
	DrivenFeatureFlagsOpenFeatureWeb.setupContainer(
		container,
		FeatureFlagsOutputPort,
	);

	const featureFlags = container.get<FeatureFlagsOutputPort>(
		FeatureFlagsOutputPort,
	);
	await featureFlags.start();

	if (!(await featureFlags.getBooleanValue("browser-agent"))) {
		return;
	}

	// This app targets MV3 on Chromium and MV2 on Firefox from one source, and
	// the drivers differ (`scripting.executeScript` vs `tabs.executeScript`).
	// WXT inlines `MANIFEST_VERSION` at build time, so the unused branch is
	// tree-shaken rather than shipped.
	if (import.meta.env.MANIFEST_VERSION === 3) {
		DrivenBrowserDriverM3.setupContainer(container);
	} else {
		DrivenBrowserDriverM2.setupContainer(container);
	}
	DrivenBrowserStateSource.setupContainer(container);

	DrivenLlmProvider.setupContainer(container);
	// Copilot is bound only when its flag is on — the adapter reaches an
	// undocumented endpoint contrary to the Copilot terms of service, so it must
	// not be present by default. See the provider's `constants.ts`.
	if (await featureFlags.getBooleanValue("copilot-provider")) {
		container
			.bind<LlmProviderStrategy>(LlmProviderStrategyToken)
			.to(CopilotProvider);
	}

	ExtensionDrivingAgentRpc.setupContainer(container);
	container.get<ExtensionDrivingAgentRpc>(ExtensionDrivingAgentRpc).start();
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

		void startAgent().catch((error: unknown) => {
			console.error("Failed to start the browser agent", error);
		});
	},
});
