import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import {
	buildHumanHintTargetKey,
	showHumanHintOverlay,
} from "../utils/human-hint-overlay";
import { TabContextStore } from "./tab-context-store";

@injectable()
export class TabHumanHintTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabHumanHintTools");
	}

	showHumanHint = async (
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> => {
		this.logger.info("Showing human hint", {
			action: params.action,
			hasReadablePath: Boolean(params.readablePath),
			hasCoordinates: params.x !== undefined && params.y !== undefined,
		});

		const targetKey = buildHumanHintTargetKey(params);

		if (params.readablePath?.trim()) {
			const readablePath = params.readablePath.trim();
			let element: HTMLElement | null = null;

			try {
				element = this.contextStore.getElementFromPath(readablePath);
			} catch (error) {
				this.logger.warn("Human hint target not found", {
					readablePath,
					error: error instanceof Error ? error.message : String(error),
				});
				return {
					ok: false,
					reason: "element not found",
					target: {
						type: "readablePath",
						readablePath,
						label: this.labelForPath(readablePath),
					},
				};
			}

			if (!element) {
				return {
					ok: false,
					reason: "element not found",
					target: {
						type: "readablePath",
						readablePath,
						label: this.labelForPath(readablePath),
					},
				};
			}

			await showHumanHintOverlay({
				targetKey,
				humanMessage,
				anchor: {
					type: "element",
					element,
				},
			});

			return {
				ok: true,
				target: {
					type: "readablePath",
					readablePath,
					label: this.labelForPath(readablePath),
				},
			};
		}

		if (params.x !== undefined && params.y !== undefined) {
			await showHumanHintOverlay({
				targetKey,
				humanMessage,
				anchor: {
					type: "coordinates",
					x: params.x,
					y: params.y,
				},
			});

			return {
				ok: true,
				target: {
					type: "coordinates",
					x: params.x,
					y: params.y,
				},
			};
		}

		return {
			ok: false,
			reason: "provide readablePath or x and y",
		};
	};

	private labelForPath = (readablePath: string): string | undefined => {
		const context = this.contextStore.getLatestCapturedTabContext();
		const record = context?.readableElementRecords.find(
			(entry) => entry[0] === readablePath,
		);
		if (!record) return undefined;
		const text = record[2]?.trim();
		if (text) return text;
		return record[1]?.trim() || undefined;
	};
}
