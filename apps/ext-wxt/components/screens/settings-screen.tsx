import type { LlmProviderDescriptor } from "@mcp-browser-kit/core-extension";
import type {
	Connection,
	ModelListResult,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ConnectionForm } from "@/components/fragments/connection-form";

export interface SettingsScreenProps {
	backHref: string;
	connections: Connection[];
	models: LlmProviderDescriptor[];
	modelsLoading: boolean;
	selectedModel?: string;
	onSelectModel: (compositeModelId: string) => void;
	onTestConnection: (
		connection: Pick<Connection, "baseUrl" | "apiKey">,
	) => Promise<ModelListResult>;
	onSaveConnection: (connection: Connection) => void;
	onDeleteConnection: (connectionId: string) => void;
}

const sectionTitle = (text: string) => (
	<Typography variant="subtitle2" color="text.secondary">
		{text}
	</Typography>
);

const ConnectionRow = ({
	connection,
	takenIds,
	onTest,
	onSave,
	onDelete,
}: {
	connection: Connection;
	takenIds: string[];
	onTest: SettingsScreenProps["onTestConnection"];
	onSave: (connection: Connection) => void;
	onDelete: () => void;
}) => {
	const [editing, setEditing] = useState(false);
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
			}}
		>
			{editing ? (
				<ConnectionForm
					initial={connection}
					takenIds={takenIds}
					onTest={onTest}
					onSave={(next) => {
						onSave(next);
						setEditing(false);
					}}
					onCancel={() => setEditing(false)}
				/>
			) : (
				<Stack
					direction="row"
					spacing={1}
					sx={{
						alignItems: "center",
					}}
				>
					<Box
						sx={{
							flexGrow: 1,
							minWidth: 0,
						}}
					>
						<Typography variant="body2">{connection.name}</Typography>
						<Typography variant="caption" color="text.secondary" noWrap>
							{connection.baseUrl}
						</Typography>
					</Box>
					<Button size="small" onClick={() => setEditing(true)}>
						Edit
					</Button>
					<Button size="small" color="error" onClick={onDelete}>
						Remove
					</Button>
				</Stack>
			)}
		</Paper>
	);
};

/** OpenAI-compatible connections and model selection. */
export const SettingsScreen = ({
	backHref,
	connections,
	models,
	modelsLoading,
	selectedModel,
	onSelectModel,
	onTestConnection,
	onSaveConnection,
	onDeleteConnection,
}: SettingsScreenProps) => {
	const takenIds = connections.map((connection) => connection.id);
	const selected =
		models.find((model) => model.id === selectedModel) ??
		(selectedModel
			? {
					id: selectedModel,
					label: selectedModel,
				}
			: null);

	return (
		<>
			<AppBar position="static" color="default" elevation={0}>
				<Toolbar
					variant="dense"
					sx={{
						gap: 1,
					}}
				>
					<IconButton
						edge="start"
						color="inherit"
						component="a"
						href={backHref}
						aria-label="Back to chat"
					>
						<ArrowBackIcon />
					</IconButton>
					<Typography
						variant="subtitle2"
						sx={{
							flexGrow: 1,
						}}
					>
						Settings
					</Typography>
				</Toolbar>
			</AppBar>

			{modelsLoading ? <LinearProgress /> : null}

			<Box
				sx={{
					overflowY: "auto",
					p: 2,
				}}
			>
				<Stack spacing={3}>
					<Stack spacing={1}>
						{sectionTitle("Model")}
						{connections.length === 0 ? (
							<Alert severity="info">
								Add a connection below to choose a model.
							</Alert>
						) : (
							<Autocomplete
								size="small"
								options={models}
								value={selected}
								loading={modelsLoading}
								isOptionEqualToValue={(option, value) => option.id === value.id}
								getOptionLabel={(option) => option.label}
								onChange={(_event, value) => {
									if (value) {
										onSelectModel(value.id);
									}
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Model"
										helperText="Pick a model that supports tool calling."
									/>
								)}
							/>
						)}
					</Stack>

					<Divider />

					<Stack spacing={1}>
						{sectionTitle("Connections")}
						{connections.map((connection) => (
							<ConnectionRow
								key={connection.id}
								connection={connection}
								takenIds={takenIds}
								onTest={onTestConnection}
								onSave={onSaveConnection}
								onDelete={() => onDeleteConnection(connection.id)}
							/>
						))}
					</Stack>

					<Divider />

					<Stack spacing={1}>
						{sectionTitle("Add a connection")}
						<Typography variant="body2" color="text.secondary">
							Any OpenAI-compatible endpoint works: OpenAI, Anthropic, Gemini,
							OpenRouter, Groq, Ollama, LM Studio, or your own proxy.
						</Typography>
						<ConnectionForm
							takenIds={takenIds}
							onTest={onTestConnection}
							onSave={onSaveConnection}
						/>
					</Stack>
				</Stack>
			</Box>
		</>
	);
};
