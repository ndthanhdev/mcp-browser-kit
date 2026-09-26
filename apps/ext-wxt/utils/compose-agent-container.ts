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
import { DrivenLlmProvider } from "@mcp-browser-kit/extension-driven-llm-provider";
import { ExtensionDrivingAgentRpc } from "@mcp-browser-kit/extension-driving-agent-rpc";

/**
 * Compose the extension hexagon the background serves the agent from.
 *
 * The drivers differ by manifest version (`scripting.executeScript` vs
 * `tabs.executeScript`). Callers pass WXT's inlined `MANIFEST_VERSION`, so the
 * unused driver is tree-shaken.
 */
export const composeAgentContainer = (manifestVersion: 2 | 3) => {
	const container = createCoreExtensionContainer();

	DrivenLoggerFactoryConsolaBrowser.setupContainer(
		container,
		LoggerFactoryOutputPort,
	);
	DrivenFeatureFlagsOpenFeatureWeb.setupContainer(
		container,
		FeatureFlagsOutputPort,
	);

	if (manifestVersion === 3) {
		DrivenBrowserDriverM3.setupContainer(container);
	} else {
		DrivenBrowserDriverM2.setupContainer(container);
	}
	DrivenBrowserStateSource.setupContainer(container);

	DrivenLlmProvider.setupContainer(container);
	ExtensionDrivingAgentRpc.setupContainer(container);

	return container;
};
