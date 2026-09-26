/** A known OpenAI-compatible endpoint, used to pre-fill a new connection. */
export interface ConnectionPreset {
	id: string;
	name: string;
	baseUrl: string;
	/** Whether the endpoint needs an API key. */
	requiresApiKey: boolean;
}

export const CONNECTION_PRESETS: readonly ConnectionPreset[] = [
	{
		id: "openai",
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		requiresApiKey: true,
	},
	{
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com/v1",
		requiresApiKey: true,
	},
	{
		id: "gemini",
		name: "Google Gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		requiresApiKey: true,
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		requiresApiKey: true,
	},
	{
		id: "groq",
		name: "Groq",
		baseUrl: "https://api.groq.com/openai/v1",
		requiresApiKey: true,
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com/v1",
		requiresApiKey: true,
	},
	{
		id: "mistral",
		name: "Mistral",
		baseUrl: "https://api.mistral.ai/v1",
		requiresApiKey: true,
	},
	{
		id: "xai",
		name: "xAI",
		baseUrl: "https://api.x.ai/v1",
		requiresApiKey: true,
	},
	{
		id: "together",
		name: "Together AI",
		baseUrl: "https://api.together.xyz/v1",
		requiresApiKey: true,
	},
	{
		id: "ollama",
		name: "Ollama",
		baseUrl: "http://localhost:11434/v1",
		requiresApiKey: false,
	},
	{
		id: "lmstudio",
		name: "LM Studio",
		baseUrl: "http://localhost:1234/v1",
		requiresApiKey: false,
	},
];
