import type {
	CustomProvider,
	ProbeResult,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import {
	toCustomProvider,
	validateBaseUrl,
	validateProviderId,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

export interface CustomProviderFormProps {
	/** Ids already taken, so the form can reject a collision before saving. */
	takenIds: string[];
	onProbe: (baseUrl: string, apiKey?: string) => Promise<ProbeResult>;
	onSave: (provider: CustomProvider, apiKey?: string) => void;
}

/**
 * Add an OpenAI-compatible endpoint models.dev doesn't list.
 *
 * Covers local servers (Ollama, LM Studio, llama.cpp) and company proxies —
 * the same escape hatch OpenCode offers through `provider` config, and the
 * fallback when a registry provider's base URL turns out to be wrong.
 *
 * Saving requires a successful probe. A provider whose `/models` call fails
 * would sit in the list looking configured and fail at the first agent turn,
 * which is a much worse place to discover a typo.
 */
export const CustomProviderForm = ({
	takenIds,
	onProbe,
	onSave,
}: CustomProviderFormProps) => {
	const [id, setId] = useState("");
	const [name, setName] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [probing, setProbing] = useState(false);
	const [probe, setProbe] = useState<ProbeResult>();

	const idError = id ? validateProviderId(id, takenIds) : undefined;
	const urlError = baseUrl ? validateBaseUrl(baseUrl) : undefined;
	const canProbe = Boolean(id && baseUrl && !(idError || urlError));

	const runProbe = async () => {
		setProbing(true);
		setProbe(undefined);
		try {
			setProbe(await onProbe(baseUrl, apiKey || undefined));
		} finally {
			setProbing(false);
		}
	};

	return (
		<Stack spacing={1.5}>
			<Typography variant="body2" color="text.secondary">
				Point the agent at any OpenAI-compatible endpoint — Ollama, LM Studio,
				llama.cpp, or a proxy.
			</Typography>

			<TextField
				size="small"
				label="Id"
				value={id}
				error={Boolean(idError)}
				helperText={idError ?? "Used internally, e.g. ollama"}
				onChange={(event) => setId(event.target.value)}
			/>
			<TextField
				size="small"
				label="Name"
				value={name}
				helperText="Shown in the picker. Defaults to the id."
				onChange={(event) => setName(event.target.value)}
			/>
			<TextField
				size="small"
				label="Base URL"
				placeholder="http://localhost:11434/v1"
				value={baseUrl}
				error={Boolean(urlError)}
				helperText={urlError}
				onChange={(event) => setBaseUrl(event.target.value)}
			/>
			<TextField
				size="small"
				type="password"
				label="API key (optional)"
				value={apiKey}
				helperText="Local servers usually need none."
				onChange={(event) => setApiKey(event.target.value)}
			/>

			<Button
				size="small"
				variant="outlined"
				disabled={!canProbe || probing}
				onClick={() => {
					void runProbe();
				}}
				sx={{
					alignSelf: "flex-start",
				}}
			>
				{probing ? "Checking…" : "Check connection"}
			</Button>

			{probe?.status === "failed" ? (
				<Alert severity="error">{probe.message}</Alert>
			) : null}

			{probe?.status === "ok" ? (
				<>
					<Alert severity="success">
						Found {probe.modelIds.length} model
						{probe.modelIds.length === 1 ? "" : "s"}.
					</Alert>
					{/* `/models` carries no capability data, so unlike registry
					    providers these cannot be filtered to tool-calling models. */}
					<Alert severity="info">
						This endpoint doesn't report which models support tool calling. Pick
						one that does — the agent cannot act without it.
					</Alert>
					<Button
						size="small"
						variant="contained"
						onClick={() => {
							onSave(
								toCustomProvider({
									id,
									name,
									baseUrl,
									modelIds: probe.modelIds,
								}),
								apiKey || undefined,
							);
							setId("");
							setName("");
							setBaseUrl("");
							setApiKey("");
							setProbe(undefined);
						}}
						sx={{
							alignSelf: "flex-start",
						}}
					>
						Add provider
					</Button>
				</>
			) : null}
		</Stack>
	);
};
