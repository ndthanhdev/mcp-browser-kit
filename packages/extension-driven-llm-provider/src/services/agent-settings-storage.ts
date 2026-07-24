import browser from "webextension-polyfill";

/** `chrome.storage.local` key the agent settings live under. */
export const AGENT_SETTINGS_STORAGE_KEY = "mbk.agent.settings";

/** Shape persisted under {@link AGENT_SETTINGS_STORAGE_KEY}. */
export interface AgentSettings {
	/** OpenRouter API key (https://openrouter.ai/keys). */
	openRouterApiKey?: string;
	/** Selected OpenRouter model slug; defaults to {@link DEFAULT_MODEL_ID}. */
	modelId?: string;
}

/**
 * Curated OpenRouter model slugs offered in the settings UI. OpenRouter exposes
 * far more; the settings page also accepts a free-text slug. NOTE: verify these
 * slugs against https://openrouter.ai/models — slugs change as models ship.
 */
export const AGENT_MODELS: ReadonlyArray<{
	id: string;
	label: string;
}> = [
	{
		id: "anthropic/claude-opus-4.1",
		label: "Claude Opus 4.1 (Anthropic)",
	},
	{
		id: "anthropic/claude-3.7-sonnet",
		label: "Claude 3.7 Sonnet (Anthropic)",
	},
	{
		id: "openai/gpt-4o",
		label: "GPT-4o (OpenAI)",
	},
	{
		id: "google/gemini-2.0-flash-001",
		label: "Gemini 2.0 Flash (Google)",
	},
];

/** Default model used when none is selected in settings. */
export const DEFAULT_MODEL_ID = AGENT_MODELS[0].id;

/** Read the persisted agent settings (empty object if unset). */
export async function readAgentSettings(): Promise<AgentSettings> {
	const record = await browser.storage.local.get(AGENT_SETTINGS_STORAGE_KEY);
	const value = record[AGENT_SETTINGS_STORAGE_KEY];
	return value && typeof value === "object" ? (value as AgentSettings) : {};
}

/** Persist the agent settings. */
export async function writeAgentSettings(
	settings: AgentSettings,
): Promise<void> {
	await browser.storage.local.set({
		[AGENT_SETTINGS_STORAGE_KEY]: settings,
	});
}
