import "core-js/proposals";
import {
	createCoreExtensionContainer,
	FeatureFlagsOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenFeatureFlagsOpenFeatureWeb } from "@mcp-browser-kit/driven-feature-flags/web";

export default defineBackground(() => {
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
