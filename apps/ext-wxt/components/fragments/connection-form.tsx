import {
	CONNECTION_PRESETS,
	type Connection,
	type ModelListResult,
	validateBaseUrl,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";

export interface ConnectionFormProps {
	/** Connection being edited; absent when adding a new one. */
	initial?: Connection;
	/** Ids already in use, to keep new connections unique. */
	takenIds: string[];
	onTest: (
		connection: Pick<Connection, "baseUrl" | "apiKey">,
	) => Promise<ModelListResult>;
	onSave: (connection: Connection) => void;
	onCancel?: () => void;
}

const CUSTOM = "custom";

const slugify = (text: string): string =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "connection";

const uniqueId = (base: string, taken: string[]): string => {
	let id = base;
	for (let n = 2; taken.includes(id); n++) {
		id = `${base}-${n}`;
	}
	return id;
};

const parseModels = (text: string): string[] | undefined => {
	const models = text
		.split(/[\s,]+/)
		.map((model) => model.trim())
		.filter(Boolean);
	return models.length > 0 ? models : undefined;
};

/** Add or edit an OpenAI-compatible connection: base URL, API key, models. */
export const ConnectionForm = ({
	initial,
	takenIds,
	onTest,
	onSave,
	onCancel,
}: ConnectionFormProps) => {
	const [preset, setPreset] = useState(initial ? CUSTOM : "");
	const [name, setName] = useState(initial?.name ?? "");
	const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
	const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
	const [models, setModels] = useState(initial?.models?.join(", ") ?? "");
	const [testing, setTesting] = useState(false);
	const [test, setTest] = useState<ModelListResult>();

	const urlError = baseUrl ? validateBaseUrl(baseUrl) : undefined;
	const canSave = Boolean(name.trim() && baseUrl && !urlError);

	const choosePreset = (value: string) => {
		setPreset(value);
		setTest(undefined);
		const match = CONNECTION_PRESETS.find((entry) => entry.id === value);
		if (match) {
			setName(match.name);
			setBaseUrl(match.baseUrl);
		}
	};

	const runTest = async () => {
		setTesting(true);
		setTest(undefined);
		try {
			setTest(
				await onTest({
					baseUrl,
					apiKey: apiKey || undefined,
				}),
			);
		} finally {
			setTesting(false);
		}
	};

	const save = () => {
		onSave({
			id:
				initial?.id ??
				uniqueId(
					slugify(preset && preset !== CUSTOM ? preset : name),
					takenIds,
				),
			name: name.trim(),
			baseUrl: baseUrl.trim(),
			apiKey: apiKey.trim() || undefined,
			models: parseModels(models),
		});
		if (!initial) {
			setPreset("");
			setName("");
			setBaseUrl("");
			setApiKey("");
			setModels("");
			setTest(undefined);
		}
	};

	return (
		<Stack spacing={1.5}>
			{initial ? null : (
				<TextField
					select
					size="small"
					label="Preset"
					value={preset}
					onChange={(event) => choosePreset(event.target.value)}
				>
					{CONNECTION_PRESETS.map((entry) => (
						<MenuItem key={entry.id} value={entry.id}>
							{entry.name}
						</MenuItem>
					))}
					<MenuItem value={CUSTOM}>Custom (any OpenAI-compatible URL)</MenuItem>
				</TextField>
			)}
			<TextField
				size="small"
				label="Name"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			<TextField
				size="small"
				label="Base URL"
				placeholder="https://api.openai.com/v1"
				value={baseUrl}
				error={Boolean(urlError)}
				helperText={urlError}
				onChange={(event) => {
					setBaseUrl(event.target.value);
					setTest(undefined);
				}}
			/>
			<TextField
				size="small"
				type="password"
				label="API key"
				value={apiKey}
				helperText="Local servers usually need none."
				onChange={(event) => {
					setApiKey(event.target.value);
					setTest(undefined);
				}}
			/>
			<TextField
				size="small"
				label="Models (optional)"
				value={models}
				helperText="Comma-separated. Used when the endpoint can't list its models."
				onChange={(event) => setModels(event.target.value)}
			/>

			{test?.status === "failed" ? (
				<Alert severity="warning">Could not list models: {test.message}</Alert>
			) : null}
			{test?.status === "ok" ? (
				<Alert severity="success">
					Connected. Found {test.modelIds.length} model
					{test.modelIds.length === 1 ? "" : "s"}.
				</Alert>
			) : null}

			<Stack direction="row" spacing={1}>
				<Button
					size="small"
					variant="outlined"
					disabled={!baseUrl || Boolean(urlError) || testing}
					onClick={() => {
						void runTest();
					}}
				>
					{testing ? "Testing…" : "Test"}
				</Button>
				<Button
					size="small"
					variant="contained"
					disabled={!canSave}
					onClick={save}
				>
					{initial ? "Save" : "Add connection"}
				</Button>
				{onCancel ? (
					<Button size="small" onClick={onCancel}>
						Cancel
					</Button>
				) : null}
			</Stack>
		</Stack>
	);
};
