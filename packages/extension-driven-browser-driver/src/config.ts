export const config = {
	/**
	 * Timeout (in ms) for DOM mutation observation during verification steps.
	 * Set to 300ms to allow sufficient time for DOM updates in slow CI environments.
	 */
	watchMutationTimeoutMs: 300,
	/** Max time to wait for a target to become actionable before acting. */
	actionabilityTimeoutMs: 5_000,
	/** The DOM counts as settled after this long without mutations. */
	settleQuietMs: 150,
	/** Upper bound on the settle wait, for pages that never go quiet. */
	settleTimeoutMs: 3_000,
	/** Max time to wait for a navigation to finish loading. */
	navigationTimeoutMs: 10_000,
};
