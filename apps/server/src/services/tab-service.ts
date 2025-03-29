export interface Tab {
	id: string;
	title: string;
	url: string;
	active: boolean;
}

export interface TabState {
	tabs: Tab[];
	activeTabId: string;
}

export class TabService {
	private state: Record<string, Tab>;

	constructor() {
		this.state = {};
	}

	public getTabs() {
		return {
			...this.state,
		};
	}

	public putTabs(tabs: Tab[]) {
		this.state = {
			...this.state,
			...Object.fromEntries(tabs.map((tab) => [tab.id, tab])),
		};
	}
}

export const tabService = new TabService();
