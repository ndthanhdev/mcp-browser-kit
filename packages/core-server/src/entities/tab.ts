export interface Tab {
	id: string;
	title: string;
	url: string;
	active: boolean;
}

export interface BasicBrowserContext {
	tabs: Tab[];
	manifestVersion: number;
}
