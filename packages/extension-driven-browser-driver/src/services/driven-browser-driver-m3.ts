import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { Screenshot } from "@mcp-browser-kit/core-extension/types";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { DrivenBrowserDriverBase } from "./driven-browser-driver-base";
import { TabRpcService } from "./tab-rpc-service";
import { TabToolsSetup } from "./tab-tools-setup";

@injectable()
export class DrivenBrowserDriverM3 extends DrivenBrowserDriverBase {
	/**
	 * Setup container bindings for M3 environment
	 */
	static setupContainer(container: Container): void {
		// Setup TabRpcService and its dependencies
		container.bind<TabRpcService>(TabRpcService).to(TabRpcService);

		// M3 browser driver
		container
			.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
			.to(DrivenBrowserDriverM3);
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
		super(loggerFactory, tabRpcService, "DrivenBrowserDriverM3");
	}

	captureTab = (_tabId: string): Promise<Screenshot> => {
		this.logger.verbose("captureTab called (not supported in M3 driver)");
		return Promise.reject("captureTab is not supported in M3 driver");
	};

	invokeJsFn = (_tabId: string, _fnBodyCode: string): Promise<unknown> => {
		this.logger.verbose("invokeJsFn called (not supported in M3 driver)");
		return Promise.reject("invokeJsFn is not supported in M3 driver");
	};
}
