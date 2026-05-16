export interface PublishBrowserStateInputPort {
	/**
	 * Start observing local browser state and publishing snapshots to all
	 * connected server channels. Idempotent.
	 */
	start: () => Promise<void>;
	/**
	 * Stop observing and release platform-level resources.
	 */
	stop: () => Promise<void>;
}

export const PublishBrowserStateInputPort = Symbol.for(
	"PublishBrowserStateInputPort",
);
