export interface ServerInfoOutputPort {
	/** Server release version (semver, e.g. "10.1.0"); "0.0.0" for unreleased builds. */
	serverVersion: string;
	/**
	 * Test-only: replaces every extension's reported version in compatibility
	 * checks, so e2e can simulate a mismatched extension.
	 */
	extensionVersionOverride?: string;
}

export const ServerInfoOutputPort = Symbol("ServerInfoOutputPort");
