import type { Tab } from "./tab";

export interface BasicBrowserContext {
	tabs: Tab[];
	manifestVersion: number;
}
