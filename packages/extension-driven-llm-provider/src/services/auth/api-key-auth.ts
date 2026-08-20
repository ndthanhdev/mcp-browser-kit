import {
	clearProviderCredential,
	readAgentSettings,
} from "../agent-settings-storage";
import type { AuthStrategy, ResolvedAuth } from "./auth-strategy";

/**
 * A plain bearer API key.
 *
 * The default, and what ~185 of the registry's ~190 providers use. models.dev
 * records the env var each provider conventionally reads (`ANTHROPIC_API_KEY`,
 * `GROQ_API_KEY`, …), but an extension has no environment — the key comes from
 * the settings page and is stored per provider id.
 */
export class ApiKeyAuth implements AuthStrategy {
	isConfigured = async (providerId: string): Promise<boolean> => {
		const settings = await readAgentSettings();
		return Boolean(settings.credentials[providerId]?.apiKey);
	};

	resolve = async (providerId: string): Promise<ResolvedAuth> => {
		const settings = await readAgentSettings();
		const apiKey = settings.credentials[providerId]?.apiKey;
		if (!apiKey) {
			throw new Error(
				`No API key stored for "${providerId}". Add one in the extension settings.`,
			);
		}
		return {
			apiKey,
		};
	};

	signOut = async (providerId: string): Promise<void> => {
		await clearProviderCredential(providerId);
	};
}
