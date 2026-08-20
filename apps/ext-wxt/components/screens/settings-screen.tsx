import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { CopilotSignInCard } from "@/components/fragments/copilot-sign-in-card";
import type {
	CopilotSignInState,
	ProviderRow,
} from "@/hooks/use-agent-settings";

export interface SettingsScreenProps {
	backHref: string;
	providers: ProviderRow[];
	/** Composite `"<provider>:<model>"` id, if one is chosen. */
	selectedModel?: string;
	openRouterApiKey?: string;
	/** Models the user can call right now, as `{providerId, modelId, label}`. */
	models: Array<{
		providerId: string;
		modelId: string;
		label: string;
	}>;
	copilotEnabled: boolean;
	copilotLogin?: string;
	copilotSignIn: CopilotSignInState;
	onSaveOpenRouterKey: (apiKey: string) => void;
	onSelectModel: (providerId: string, modelId: string) => void;
	onCopilotSignIn: () => void;
	onCopilotCancel: () => void;
	onCopilotSignOut: () => void;
}

const sectionTitle = (text: string) => (
	<Typography variant="subtitle2" color="text.secondary">
		{text}
	</Typography>
);

/** Provider credentials and model selection. */
export const SettingsScreen = ({
	backHref,
	providers,
	models,
	selectedModel,
	openRouterApiKey,
	copilotEnabled,
	copilotLogin,
	copilotSignIn,
	onSaveOpenRouterKey,
	onSelectModel,
	onCopilotSignIn,
	onCopilotCancel,
	onCopilotSignOut,
}: SettingsScreenProps) => {
	const [keyDraft, setKeyDraft] = useState(openRouterApiKey ?? "");

	const copilot = providers.find(
		(provider) => provider.id === "github-copilot",
	);

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

			<Box
				sx={{
					overflowY: "auto",
					p: 2,
				}}
			>
				<Stack spacing={3}>
					<Stack spacing={1}>
						{sectionTitle("Model")}
						{models.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Sign in to a provider below to choose a model.
							</Typography>
						) : (
							<TextField
								select
								size="small"
								label="Model"
								value={selectedModel ?? ""}
								onChange={(event) => {
									const [providerId, ...rest] = event.target.value.split(":");
									onSelectModel(providerId, rest.join(":"));
								}}
							>
								{models.map((model) => (
									<MenuItem
										key={`${model.providerId}:${model.modelId}`}
										value={`${model.providerId}:${model.modelId}`}
									>
										{model.label}
									</MenuItem>
								))}
							</TextField>
						)}
					</Stack>

					<Divider />

					<Stack spacing={1}>
						{sectionTitle("OpenRouter")}
						<TextField
							size="small"
							type="password"
							label="API key"
							placeholder="sk-or-…"
							value={keyDraft}
							onChange={(event) => setKeyDraft(event.target.value)}
							onBlur={() => onSaveOpenRouterKey(keyDraft)}
							helperText="From openrouter.ai/keys. Saved when the field loses focus."
						/>
					</Stack>

					{copilotEnabled ? (
						<>
							<Divider />
							<Stack spacing={1}>
								{sectionTitle("GitHub Copilot")}
								<Alert severity="warning">
									GitHub publishes no third-party API for Copilot. This signs in
									as an editor would, which is contrary to the Copilot terms of
									service and may get your account rate-limited or flagged. Use
									OpenRouter if you would rather not take that risk.
								</Alert>
								<CopilotSignInCard
									state={copilotSignIn}
									login={copilotLogin}
									signedIn={copilot?.configured ?? false}
									onSignIn={onCopilotSignIn}
									onCancel={onCopilotCancel}
									onSignOut={onCopilotSignOut}
								/>
							</Stack>
						</>
					) : null}
				</Stack>
			</Box>
		</>
	);
};
