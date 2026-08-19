import { describe, expect, it } from "vitest";
import { AGENT_SETTINGS_STORAGE_KEY } from "./agent-settings-storage";

describe("agent settings storage", () => {
	it("pins the storage key so persisted settings survive refactors", () => {
		expect(AGENT_SETTINGS_STORAGE_KEY).toBe("mbk.agent.settings");
	});
});
