import "core-js/proposals";
import {
	createCoreExtensionContainer,
	FeatureFlagsOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenFeatureFlagsOpenFeatureWeb } from "@mcp-browser-kit/driven-feature-flags/web";

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

export default defineBackground(() => {
	openSidepanelOnActionClick();

	const container = createCoreExtensionContainer();
	DrivenFeatureFlagsOpenFeatureWeb.setupContainer(
		container,
		FeatureFlagsOutputPort,
	);

	const featureFlags = container.get<FeatureFlagsOutputPort>(
		FeatureFlagsOutputPort,
	);

	void featureFlags
		.start()
		.then(() => featureFlags.getBooleanValue("browser-agent"))
		.then((browserAgentEnabled) => {
			console.log("Hello background!", {
				id: browser.runtime.id,
				browserAgentEnabled,
			});
		});
});
