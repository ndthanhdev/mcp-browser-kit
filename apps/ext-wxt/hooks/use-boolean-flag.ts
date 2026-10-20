import {
	createCoreExtensionContainer,
	FeatureFlagsOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { BooleanFlagKey } from "@mcp-browser-kit/core-feature-flags";
import { DrivenFeatureFlagsOpenFeatureWeb } from "@mcp-browser-kit/driven-feature-flags/web";
import { useEffect, useState } from "react";

/** One flag evaluator per sidepanel document, so the provider starts once. */
const started = (async () => {
	const container = createCoreExtensionContainer();
	DrivenFeatureFlagsOpenFeatureWeb.setupContainer(
		container,
		FeatureFlagsOutputPort,
	);
	const flags = container.get<FeatureFlagsOutputPort>(FeatureFlagsOutputPort);
	await flags.start();
	return flags;
})();

/** Read a boolean feature flag; `undefined` while the provider is starting. */
export const useBooleanFlag = (
	flagKey: BooleanFlagKey,
): boolean | undefined => {
	const [value, setValue] = useState<boolean>();

	useEffect(() => {
		let active = true;
		void started
			.then((flags) => flags.getBooleanValue(flagKey))
			.then((resolved) => {
				if (active) {
					setValue(resolved);
				}
			})
			.catch(() => {
				if (active) {
					setValue(false);
				}
			});
		return () => {
			active = false;
		};
	}, [
		flagKey,
	]);

	return value;
};
