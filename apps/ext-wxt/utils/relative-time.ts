/** Coarse relative time; the sidepanel is too narrow for a full timestamp. */
export const relativeTime = (at: number, from: number) => {
	const minutes = Math.round((from - at) / 60_000);
	if (minutes < 1) {
		return "just now";
	}
	if (minutes < 60) {
		return `${minutes}m ago`;
	}
	const hours = Math.round(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}
	return `${Math.round(hours / 24)}d ago`;
};
