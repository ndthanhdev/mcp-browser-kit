/**
 * In-memory stand-in for `webextension-polyfill`, aliased in by
 * `vitest.config.ts`. The real polyfill throws on import outside an extension
 * ("This script should only be loaded in a browser extension"), which would
 * fail any test file that transitively imports a module touching
 * `browser.storage`.
 *
 * Only the surface this package actually uses is implemented. Tests that care
 * about persisted state drive it through {@link resetBrowserStub}.
 */

let store: Record<string, unknown> = {};

/** Clear the fake `storage.local`, and optionally seed it. Call in `beforeEach`. */
export const resetBrowserStub = (seed: Record<string, unknown> = {}): void => {
	store = {
		...seed,
	};
};

/** Read the whole fake `storage.local` — for asserting on writes. */
export const readBrowserStubStore = (): Record<string, unknown> => ({
	...store,
});

const browser = {
	storage: {
		local: {
			get: async (
				keys: string | string[],
			): Promise<Record<string, unknown>> => {
				const wanted = Array.isArray(keys)
					? keys
					: [
							keys,
						];
				return Object.fromEntries(
					wanted
						.filter((key) => key in store)
						.map((key) => [
							key,
							store[key],
						]),
				);
			},
			set: async (items: Record<string, unknown>): Promise<void> => {
				store = {
					...store,
					...items,
				};
			},
			remove: async (keys: string | string[]): Promise<void> => {
				const unwanted = Array.isArray(keys)
					? keys
					: [
							keys,
						];
				for (const key of unwanted) {
					delete store[key];
				}
			},
		},
	},
};

export default browser;
