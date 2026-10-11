import { shortChannelId } from "@mcp-browser-kit/core-utils";
import { inject, injectable } from "inversify";
import type {
	VersionCompatibility,
	VersionCompatibilityInputPort,
} from "../input-ports/version-compatibility";
import { LoggerFactoryOutputPort, ServerInfoOutputPort } from "../output-ports";
import { BrowserStateRegistry } from "./browser-state-registry";

const UNRELEASED_VERSION = "0.0.0";

/** Leading numeric segment of a version; null when it can't be read. */
export const parseMajorVersion = (version: string): number | null => {
	const match = /^v?(\d+)(?:\.|$)/.exec(version.trim());
	return match ? Number(match[1]) : null;
};

const isUnreleased = (version: string): boolean =>
	version.trim() === UNRELEASED_VERSION;

/**
 * Server and extension are compatible when their semver major versions match.
 * Unreleased builds ("0.0.0") on either side skip the check.
 */
@injectable()
export class VersionCompatibilityUseCases
	implements VersionCompatibilityInputPort
{
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(ServerInfoOutputPort)
		private readonly serverInfo: ServerInfoOutputPort,
		@inject(BrowserStateRegistry)
		private readonly registry: BrowserStateRegistry,
	) {
		this.logger = loggerFactory.create("VersionCompatibility");
	}

	getServerVersion = (): string => this.serverInfo.serverVersion;

	check = (channelId: string): VersionCompatibility => {
		const serverVersion = this.serverInfo.serverVersion;
		const browserId = shortChannelId(channelId);
		const extensionVersion =
			this.serverInfo.extensionVersionOverride ??
			this.registry.getBrowser(channelId)?.snapshot.extensionInfo
				?.extensionVersion;

		if (isUnreleased(serverVersion)) {
			return {
				compatible: true,
			};
		}

		if (!extensionVersion) {
			return {
				compatible: false,
				serverVersion,
				message: `Browser ${browserId} hasn't reported its extension version yet — retry in a moment. If this persists, update the browser extension to ${serverVersion}.`,
			};
		}

		if (isUnreleased(extensionVersion)) {
			return {
				compatible: true,
			};
		}

		const serverMajor = parseMajorVersion(serverVersion);
		const extensionMajor = parseMajorVersion(extensionVersion);
		if (serverMajor === null || extensionMajor === null) {
			this.logger.warn("Unreadable version", {
				serverVersion,
				extensionVersion,
			});
			return {
				compatible: false,
				serverVersion,
				extensionVersion,
				message: `Browser ${browserId} reports extension version "${extensionVersion}", which can't be compared with server ${serverVersion}. Update the browser extension and the MCP Browser Kit server to the latest release.`,
			};
		}

		if (serverMajor === extensionMajor) {
			return {
				compatible: true,
			};
		}

		const update = extensionMajor < serverMajor ? "extension" : "server";
		const advice =
			update === "extension"
				? `Update the browser extension to ${serverMajor}.x.`
				: `Update the MCP Browser Kit server to ${extensionMajor}.x (e.g. reinstall with @latest) and restart your MCP client.`;
		return {
			compatible: false,
			serverVersion,
			extensionVersion,
			update,
			message: `Browser ${browserId} runs extension ${extensionVersion} but the server is ${serverVersion} (major versions differ). ${advice}`,
		};
	};
}
