/** Output format for a saved page. */
export type PageSaveFormat = "html" | "zip";

/** Why a subresource could not be embedded in the saved page. */
export type PageSaveSkipReason = "cors" | "too-large" | "timeout" | "error";

export interface PageSaveSkippedResource {
	url: string;
	reason: PageSaveSkipReason;
}

export interface PageSaveOptions {
	format: PageSaveFormat;
	/** Abort the whole capture once the artifact exceeds this many bytes. */
	maxTotalBytes?: number;
	/** Skip any single subresource larger than this many bytes. */
	maxResourceBytes?: number;
	/** Abort the capture after this many milliseconds. */
	timeoutMs?: number;
}

export interface PageSaveResult {
	/** Filename the artifact was saved as, including extension. */
	filename: string;
	/** Size of the saved artifact in bytes. */
	bytes: number;
	format: PageSaveFormat;
	/** Number of subresources successfully embedded. */
	resourceCount: number;
	/** Subresources that could not be embedded, with the reason for each. */
	skipped: PageSaveSkippedResource[];
}
