import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { Screenshot } from "@mcp-browser-kit/core-extension/types";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import * as backgroundToolsM2 from "../utils/background-tools-m2";
import { DrivenBrowserDriverBase } from "./driven-browser-driver-base";
import { TabRpcService } from "./tab-rpc-service";
import { TabToolsSetup } from "./tab-tools-setup";

@injectable()
export class DrivenBrowserDriverM2 extends DrivenBrowserDriverBase {
	/**
	 * Setup container bindings for M2 environment
	 */
	static setupContainer(container: Container): void {
		// Setup TabRpcService and its dependencies
		container.bind<TabRpcService>(TabRpcService).to(TabRpcService);

		// M2 browser driver
		container
			.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
			.to(DrivenBrowserDriverM2);
	}

	static setupTabContainer(container: Container): void {
		TabToolsSetup.setupContainer(container);
	}

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(TabRpcService)
		tabRpcService: TabRpcService,
	) {
		super(loggerFactory, tabRpcService, "DrivenBrowserDriverM2");
	}

	captureTab = (tabId: string): Promise<Screenshot> => {
		this.logger.verbose(`Capturing tab: ${tabId}`);
		return backgroundToolsM2.captureTab(tabId);
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		this.logger.verbose(`Invoking JS function in tab: ${tabId}`);
		return backgroundToolsM2.invokeJsFn(tabId, fnBodyCode);
	};
}
