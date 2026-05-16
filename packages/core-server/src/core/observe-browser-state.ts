import { inject, injectable } from "inversify";
import type { ObserveBrowserStateInputPort } from "../input-ports";
import {
	type BrowserStateEntry,
	BrowserStateRegistry,
} from "./browser-state-registry";

/**
 * Exposes read + subscribe access to the browser-state registry via the
 * `ObserveBrowserStateInputPort`. Keeps the concrete `BrowserStateRegistry`
 * collaborator out of the port surface.
 */
@injectable()
export class ObserveBrowserStateUseCases
	implements ObserveBrowserStateInputPort
{
	constructor(
		@inject(BrowserStateRegistry)
		private readonly registry: BrowserStateRegistry,
	) {}

	listBrowsers = (): BrowserStateEntry[] => this.registry.listBrowsers();

	getBrowser = (channelId: string): BrowserStateEntry | undefined =>
		this.registry.getBrowser(channelId);

	onChange = (listener: (channelId: string) => void): (() => void) =>
		this.registry.subscribe(listener);
}
