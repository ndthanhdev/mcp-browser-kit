import type { Tab } from "../entities/tab";

export interface GetTabsInputPort {
	getTabsInstruction(): string;
	getTabs(): Promise<Tab[]>;
}
export const GetTabsInputPort = Symbol("GetTabsInputPort");
