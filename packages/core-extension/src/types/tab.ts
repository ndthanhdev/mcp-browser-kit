export interface Tab {
	foreground: boolean;
	extensionId: string;
	tabId: string;
	title: string;
	url: string;
	windowId: string;
}

export interface ExtensionInstance {
	id: string;
	manifestVersion: number;
	active: boolean;
}
