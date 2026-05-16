import browser from "webextension-polyfill";

const TAB_CONTENT_CHANGED_KIND = "mbk.tabContent.changed";
const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Content-script helper: installs a top-frame MutationObserver, debounces
 * bursts, and posts a `mbk.tabContent.changed` runtime message. The
 * background-side `DrivenBrowserStateSource` listens for these messages.
 *
 * Top-frame only by design:
 *   - Cross-origin iframes cannot install observers anyway.
 *   - Same-origin iframes are rare enough, and observing them would
 *     multiply noise without clear value in v1.
 */
export class TabContentMutationObserver {
	private observer: MutationObserver | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly debounceMs: number;

	constructor(debounceMs: number = DEFAULT_DEBOUNCE_MS) {
		this.debounceMs = debounceMs;
	}

	start = (): void => {
		if (this.observer) {
			return;
		}
		// Top-frame only.
		if (typeof window !== "undefined" && window.top !== window.self) {
			return;
		}
		if (typeof document === "undefined") {
			return;
		}

		this.observer = new MutationObserver(this.handleMutations);
		this.observer.observe(document.documentElement ?? document, {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
		});
	};

	stop = (): void => {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	};

	private handleMutations = (): void => {
		if (this.debounceTimer) {
			return;
		}
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null;
			this.postMessage();
		}, this.debounceMs);
	};

	private postMessage = (): void => {
		try {
			browser.runtime
				.sendMessage({
					kind: TAB_CONTENT_CHANGED_KIND,
					at: Date.now(),
				})
				.catch(() => {
					// Background may be asleep/unreachable; ignore. Next
					// mutation will retry.
				});
		} catch {
			// sendMessage can throw synchronously in some browsers when the
			// extension context is gone. Ignore.
		}
	};
}
