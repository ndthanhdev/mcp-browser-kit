import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import browser from "webextension-polyfill";

export interface FrameInfo {
	frameId: string;
	parentFrameId: string | null;
	url: string;
}

/**
 * Enumerates the live frames of a tab via `browser.webNavigation.getAllFrames`.
 * No caching: always fetched fresh, so a navigated-away or destroyed frame
 * never leaves stale state behind.
 */
@injectable()
export class FrameRegistryService {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("FrameRegistryService");
	}

	listFrames = async (tabId: string): Promise<FrameInfo[]> => {
		const frames = await browser.webNavigation.getAllFrames({
			tabId: Number(tabId),
		});
		this.logger.verbose(
			`Found ${frames?.length ?? 0} frames for tab: ${tabId}`,
		);
		return (frames ?? []).map((frame) => ({
			frameId: String(frame.frameId),
			parentFrameId:
				frame.parentFrameId >= 0 ? String(frame.parentFrameId) : null,
			url: frame.url,
		}));
	};
}
