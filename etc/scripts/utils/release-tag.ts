import { workDirs } from "@mcp-browser-kit/scripts/utils/work-dirs";
import simpleGit from "simple-git";
import { getReleaseTag } from "./get-envs";

// V0 tags use the format v0.yyMMd.dhhmm-ss (e.g., v0.26032.00830-05).
// These contain leading zeros which makes them invalid semver, so we match them manually.
// Release tags use standard semver (e.g., v1.2.3).
export const V0_TAG_PATTERN = /^v(0\.\d{5}\.\d{5})-(\d{2})$/;

export const resolveFirefoxChannel = (tag: string): "listed" | "unlisted" =>
	V0_TAG_PATTERN.test(tag) ? "unlisted" : "listed";

export const resolveReleaseTag = async (): Promise<string> => {
	const rawTag = getReleaseTag();

	if (rawTag) {
		console.log(`Using RELEASE_TAG from environment: "${rawTag}"`);
		return rawTag;
	}

	console.log("RELEASE_TAG not set, falling back to git tag lookup...");
	const git = simpleGit(workDirs.path);
	const tagOutput = await git.raw([
		"tag",
		"--points-at",
		"HEAD",
		"--sort=-creatordate",
	]);
	const tags = tagOutput.trim().split("\n").filter(Boolean);

	if (tags.length === 0) {
		console.error("No git tag found on HEAD.");
		process.exit(1);
	}

	const tag = tags[0];
	console.log(`Found git tag "${tag}"`);
	return tag;
};
