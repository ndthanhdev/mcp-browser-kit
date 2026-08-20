/**
 * How a provider proves who we are.
 *
 * A separate axis from *which SDK builds the model* and *what models exist*.
 * Nearly every provider in the registry is a plain bearer key; a handful need a
 * flow. Keeping this apart is what lets ~190 providers share one code path
 * while GitHub Copilot's device flow stays contained.
 */
export interface AuthStrategy {
	/** Whether usable credentials are stored for this provider. */
	isConfigured(providerId: string): Promise<boolean>;

	/**
	 * Headers to attach to every request, or the key the SDK should use.
	 *
	 * Returns `apiKey` when the SDK can hold a static credential, and/or
	 * `headers` for anything the SDK won't manage. Copilot returns neither and
	 * supplies a `fetch` wrapper instead, because its bearer expires mid-turn.
	 */
	resolve(providerId: string): Promise<ResolvedAuth>;

	/** Forget stored credentials. */
	signOut(providerId: string): Promise<void>;
}

/** What an {@link AuthStrategy} contributes to an outgoing request. */
export interface ResolvedAuth {
	/** Static credential handed to the SDK, which sets `Authorization` itself. */
	apiKey?: string;
	/** Extra headers merged into every request. */
	headers?: Record<string, string>;
	/**
	 * Replacement `fetch` for credentials that can't be captured once — a token
	 * that expires part-way through a 32-step tool loop, for instance.
	 */
	fetch?: typeof fetch;
	/** Base URL override discovered during authentication. */
	baseUrl?: string;
}
