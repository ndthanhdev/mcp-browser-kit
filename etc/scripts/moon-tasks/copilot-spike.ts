/**
 * Phase 0 spike — answers the one question that decides whether the GitHub
 * Copilot provider can exist at all.
 *
 * OpenCode reaches `api.githubcopilot.com` with a client id it registered
 * itself, sending no editor-impersonation headers. Our adapter was built on the
 * older reverse-engineered path (VS Code's client id, a `copilot_internal`
 * token exchange, spoofed `editor-version` headers). Reading OpenCode's source
 * cannot tell us *why* their id is accepted:
 *
 *   (a) GitHub accepts a user token from any GitHub App whose user has a
 *       Copilot subscription — in which case we register our own and the
 *       impersonation code can be deleted outright; or
 *   (b) GitHub allow-lists specific client ids — in which case there is no
 *       legitimate route for us and the provider should be removed.
 *
 * This script distinguishes them empirically. Run it with a client id from a
 * GitHub App you control:
 *
 *     moon run scripts:copilot-spike -- <CLIENT_ID>
 *
 * The App needs two settings:
 *   - "Device Flow" ENABLED — otherwise step 1 returns 400.
 *   - "Expire user authorization tokens" DISABLED — otherwise the token lasts
 *     8 hours and the adapter needs refresh handling we have not written.
 *
 * Nothing here is imported by the extension; it exists to replace an assumption
 * with a fact, and can be deleted once that fact is recorded.
 */

const API_VERSION = "2026-06-01";
const USER_AGENT = "mcp-browser-kit-spike";
const COPILOT_API_BASE_URL = "https://api.githubcopilot.com";

const jsonHeaders = {
	accept: "application/json",
	"content-type": "application/json",
	"user-agent": USER_AGENT,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface DeviceCodeResponse {
	// biome-ignore lint/style/useNamingConvention: GitHub wire format.
	device_code?: string;
	// biome-ignore lint/style/useNamingConvention: GitHub wire format.
	user_code?: string;
	// biome-ignore lint/style/useNamingConvention: GitHub wire format.
	verification_uri?: string;
	interval?: number;
	message?: string;
}

interface AccessTokenResponse {
	// biome-ignore lint/style/useNamingConvention: GitHub wire format.
	access_token?: string;
	error?: string;
	// biome-ignore lint/style/useNamingConvention: GitHub wire format.
	error_description?: string;
	interval?: number;
}

const requestDeviceCode = async (
	clientId: string,
): Promise<DeviceCodeResponse> => {
	const response = await fetch("https://github.com/login/device/code", {
		method: "POST",
		headers: jsonHeaders,
		body: JSON.stringify({
			// biome-ignore lint/style/useNamingConvention: GitHub wire format.
			client_id: clientId,
			scope: "read:user",
		}),
	});
	const body = (await response.json()) as DeviceCodeResponse;
	if (!response.ok || !body.device_code) {
		throw new Error(
			`Device-code request failed (${response.status}): ${JSON.stringify(body)}\n` +
				"If this says the client id is invalid, check the App exists and has Device Flow enabled.",
		);
	}
	return body;
};

const pollForToken = async (
	clientId: string,
	deviceCode: string,
	intervalSeconds: number,
): Promise<string> => {
	let intervalMs = intervalSeconds * 1000;
	const deadline = Date.now() + 15 * 60 * 1000;

	while (Date.now() < deadline) {
		await delay(intervalMs);
		const response = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: jsonHeaders,
				body: JSON.stringify({
					// biome-ignore lint/style/useNamingConvention: GitHub wire format.
					client_id: clientId,
					// biome-ignore lint/style/useNamingConvention: GitHub wire format.
					device_code: deviceCode,
					// biome-ignore lint/style/useNamingConvention: GitHub wire format.
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				}),
			},
		);
		const body = (await response.json()) as AccessTokenResponse;

		if (body.access_token) {
			return body.access_token;
		}
		if (body.error === "authorization_pending") {
			continue;
		}
		if (body.error === "slow_down") {
			intervalMs = (body.interval ?? intervalSeconds + 5) * 1000;
			continue;
		}
		throw new Error(
			`Device flow failed: ${body.error} — ${body.error_description ?? ""}`,
		);
	}
	throw new Error("Timed out waiting for authorization.");
};

/** The decisive call: does Copilot accept this token, with no impersonation? */
const listModels = async (token: string) => {
	const response = await fetch(`${COPILOT_API_BASE_URL}/models`, {
		headers: {
			authorization: `Bearer ${token}`,
			"user-agent": USER_AGENT,
			"x-github-api-version": API_VERSION,
		},
	});
	const text = await response.text();
	return {
		status: response.status,
		text,
	};
};

/** Confirms the token is good for inference, not just for listing. */
const chatCompletion = async (token: string, model: string) => {
	const response = await fetch(`${COPILOT_API_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
			"user-agent": USER_AGENT,
			"x-github-api-version": API_VERSION,
			"openai-intent": "conversation-edits",
			"x-initiator": "agent",
			"x-request-id": crypto.randomUUID(),
		},
		body: JSON.stringify({
			model,
			messages: [
				{
					role: "user",
					content: "Reply with exactly: ok",
				},
			],
			// biome-ignore lint/style/useNamingConvention: OpenAI wire format.
			max_tokens: 10,
		}),
	});
	const text = await response.text();
	return {
		status: response.status,
		text,
	};
};

const main = async () => {
	const clientId = process.argv[2];
	if (!clientId) {
		console.error(
			"Usage: moon run scripts:copilot-spike -- <CLIENT_ID>\n\n" +
				"Register a GitHub App (Device Flow enabled, token expiry disabled)\n" +
				"and pass its client id. It will look like Iv23li... or Ov23li....",
		);
		process.exit(1);
	}

	console.log("1. Requesting device code...");
	const grant = await requestDeviceCode(clientId);
	console.log(`\n   Open: ${grant.verification_uri}`);
	console.log(`   Code: ${grant.user_code}\n`);
	console.log("2. Waiting for authorization...");

	const token = await pollForToken(
		clientId,
		grant.device_code as string,
		grant.interval ?? 5,
	);
	console.log(
		`   Got a user token (${token.slice(0, 4)}..., ${token.length} chars)\n`,
	);

	// Printed because a model list is only meaningful next to the account it
	// belongs to. Comparing two runs without this invites comparing two
	// different accounts and blaming the client.
	const who = await fetch("https://api.github.com/user", {
		headers: {
			authorization: `Bearer ${token}`,
			accept: "application/vnd.github+json",
			"user-agent": USER_AGENT,
		},
	})
		.then(
			async (response) =>
				(await response.json()) as {
					login?: string;
				},
		)
		.catch(() => ({
			login: undefined,
		}));
	console.log(`   Signed in as: ${who.login ?? "(unknown)"}\n`);

	console.log("3. GET /models with NO impersonation headers...");
	const models = await listModels(token);
	console.log(`   HTTP ${models.status}`);

	if (models.status !== 200) {
		console.log(`   Body: ${models.text.slice(0, 400)}\n`);
		console.log(
			"VERDICT: this client id is NOT accepted.\n" +
				"A 401/403 here is the allow-listing answer — GitHub does not grant\n" +
				"Copilot API access to arbitrary Apps, so there is no legitimate route\n" +
				"and the adapter should be deleted rather than kept behind a flag.",
		);
		process.exit(2);
	}

	const parsed = JSON.parse(models.text) as {
		data?: {
			id?: string;
			capabilities?: {
				type?: string;
			};
		}[];
	};
	const chat = (parsed.data ?? []).filter(
		(entry) => entry.capabilities?.type === "chat",
	);
	console.log(
		`   ${parsed.data?.length ?? 0} models, ${chat.length} chat-capable`,
	);
	console.log(
		`   e.g. ${chat
			.slice(0, 5)
			.map((entry) => entry.id)
			.join(", ")}\n`,
	);

	const model = chat[0]?.id;
	if (!model) {
		console.log(
			"No chat model returned; stopping before the completion check.",
		);
		return;
	}

	console.log(`4. POST /chat/completions with ${model}...`);
	const completion = await chatCompletion(token, model);
	console.log(`   HTTP ${completion.status}`);
	console.log(`   ${completion.text.slice(0, 300)}\n`);

	if (completion.status === 200) {
		console.log(
			"VERDICT: authentication works. A self-registered GitHub App completes\n" +
				"the device flow and reaches Copilot with an honest User-Agent and no\n" +
				"token exchange, so no impersonation is needed.\n\n" +
				"This says nothing about WHICH models the app can reach. Model access\n" +
				"is scoped to the registered client. Holding the account fixed, the\n" +
				"same login that reaches claude-opus-5 through an established client is\n" +
				"offered only gpt-4o and gpt-3.5-turbo through a newly registered one.\n" +
				"Installing the app, publishing it, and registering an OAuth App rather\n" +
				"than a GitHub App all change nothing. Read the list above, next to the\n" +
				"login above it, as the real ceiling.",
		);
	} else {
		console.log(
			"VERDICT: /models succeeded but inference did not. Record the status and\n" +
				"body above — it distinguishes a scope/permission problem on the App\n" +
				"from a hard allow-listing restriction.",
		);
	}
};

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
