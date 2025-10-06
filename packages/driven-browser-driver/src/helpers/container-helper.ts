import type { Container } from "inversify";
import { DrivenBrowserDriverM2 } from "./driven-browser-driver-m2";
import { DrivenBrowserDriverM3 } from "./driven-browser-driver-m3";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";
import { TabDomTools } from "./tab-dom-tools";
import { TabRpcService } from "./tab-rpc-service";
import { TabTools } from "./tab-tools";
import { TabToolsSetup } from "./tab-tools-setup";

/**
 * Complete setup for M2 environment - includes tab services and M2 driver
 */
export function setupM2Container(container: Container): void {
	// Tab services
	container.bind<TabTools>(TabTools).to(TabTools);
	container.bind<TabDomTools>(TabDomTools).to(TabDomTools);
	container.bind<TabAnimationTools>(TabAnimationTools).to(TabAnimationTools);
	container.bind<TabContextStore>(TabContextStore).to(TabContextStore);
	container.bind<TabToolsSetup>(TabToolsSetup).to(TabToolsSetup);

	// M2 browser driver
	container.bind<TabRpcService>(TabRpcService).to(TabRpcService);
	container
		.bind<DrivenBrowserDriverM2>(DrivenBrowserDriverM2)
		.to(DrivenBrowserDriverM2);
}

/**
 * Complete setup for M3 environment - includes tab services and M3 driver
 */
export function setupM3Container(container: Container): void {
	// Tab services
	container.bind<TabTools>(TabTools).to(TabTools);
	container.bind<TabDomTools>(TabDomTools).to(TabDomTools);
	container.bind<TabAnimationTools>(TabAnimationTools).to(TabAnimationTools);
	container.bind<TabContextStore>(TabContextStore).to(TabContextStore);
	container.bind<TabToolsSetup>(TabToolsSetup).to(TabToolsSetup);

	// M3 browser driver services
	container.bind<TabRpcService>(TabRpcService).to(TabRpcService);
	container
		.bind<DrivenBrowserDriverM3>(DrivenBrowserDriverM3)
		.to(DrivenBrowserDriverM3);
}

export const ContainerHelper = {
	setupM2Container,
	setupM3Container,
};
