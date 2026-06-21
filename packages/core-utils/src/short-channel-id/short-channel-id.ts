/**
 * Strips the prefix (everything up to and including the first `:`) from a
 * channelId, returning only the nanoid portion. Falls back to the raw value
 * if no prefix is present.
 *
 * This nanoid portion is the public-facing `browserId` used in MCP tool calls
 * and `bk:///browsers/<browserId>/...` resource URIs. It is unique per
 * connection, unlike the extension id.
 */
export const shortChannelId = (channelId: string): string => {
	const colon = channelId.indexOf(":");
	return colon >= 0 ? channelId.slice(colon + 1) : channelId;
};
