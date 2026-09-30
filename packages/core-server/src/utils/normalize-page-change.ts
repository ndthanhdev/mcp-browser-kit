import type { PageChange } from "@mcp-browser-kit/core-extension";

/**
 * Extensions released before page-change results return nothing from write
 * tools. Report the action as done with unknown effect rather than failing,
 * since the action itself already ran and a failure would invite a retry.
 */
export const normalizePageChange = (
	result: PageChange | undefined | null,
): PageChange =>
	result ?? {
		changed: false,
		navigated: false,
		url: "",
		added: 0,
		removed: 0,
		tooLarge: true,
		pathsShifted: true,
		detailsUnavailable: true,
	};
