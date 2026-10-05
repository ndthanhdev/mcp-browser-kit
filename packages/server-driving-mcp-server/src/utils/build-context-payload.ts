import type {
	BrowserStateEntry,
	VersionCompatibilityInputPort,
} from "@mcp-browser-kit/core-server";
import { shortChannelId } from "@mcp-browser-kit/core-utils";
import { findWindowIdForTab, tabBkUri } from "./browser-resource-uris";

/**
 * Builds the aggregated context shared by the `bk:///context` resource and the
 * `getContext` tool. Browsers whose extension major version differs from the
 * server's carry a `versionMismatch`; their tools are refused.
 */
export const buildContextPayload = (
	entries: BrowserStateEntry[],
	versionCompatibility: VersionCompatibilityInputPort,
) => {
	const browsers = entries
		.filter((e) => e.snapshot.status !== "offline")
		.map((entry) => {
			const { snapshot, channelId } = entry;

			const windows = snapshot.windows.map((w) => ({
				id: w.id,
				focused: w.focused,
			}));

			const tabs = snapshot.tabs.map((tab) => {
				const windowId = tab.windowId ?? findWindowIdForTab(snapshot, tab.id);
				return {
					id: tab.id,
					windowId,
					url: tab.url,
					title: tab.title,
					active: tab.active,
					tabUri: tabBkUri(channelId, tab.id),
				};
			});

			const compatibility = versionCompatibility.check(channelId);
			const versionMismatch = compatibility.compatible
				? undefined
				: {
						serverVersion: compatibility.serverVersion,
						extensionVersion: compatibility.extensionVersion,
						update: compatibility.update,
						message: compatibility.message,
					};

			return {
				browserId: shortChannelId(channelId),
				status: snapshot.status,
				browserInfo: snapshot.browserInfo,
				extensionInfo: snapshot.extensionInfo,
				...(versionMismatch && {
					versionMismatch,
				}),
				windows,
				tabs,
			};
		});

	return {
		serverVersion: versionCompatibility.getServerVersion(),
		browsers,
	};
};
