export type VersionCompatibility =
	| {
			compatible: true;
	  }
	| {
			compatible: false;
			serverVersion: string;
			/** Undefined when the extension hasn't reported its version yet. */
			extensionVersion?: string;
			/** Which side to update; undefined when the extension version is unknown. */
			update?: "extension" | "server";
			/** Human-readable explanation for the user. */
			message: string;
	  };

export interface VersionCompatibilityInputPort {
	getServerVersion: () => string;
	/** Compares the server's and the extension's semver major versions. */
	check: (channelId: string) => VersionCompatibility;
}

export const VersionCompatibilityInputPort = Symbol(
	"VersionCompatibilityInputPort",
);
