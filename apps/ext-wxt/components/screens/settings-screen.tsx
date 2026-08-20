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
	ProviderState,
} from "@/hooks/use-agent-settings";

export interface SettingsScreenProps {
	backHref: string;
	providers: ProviderState[];
	/** Composite `"<provider>:<model>"` id, if one is chosen. */
	selectedModel?: string;
	openRouterApiKey?: string;
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

	const openRouter = providers.find((provider) => provider.id === "openrouter");
	const copilot = providers.find((provider) => provider.id === "copilot");
	const allModels = providers.flatMap((provider) =>
		provider.models.map((model) => ({
			providerId: provider.id,
			providerLabel: provider.label,
			...model,
		})),
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
						{allModels.length === 0 ? (
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
								{allModels.map((model) => (
									<MenuItem
										key={`${model.providerId}:${model.id}`}
										value={`${model.providerId}:${model.id}`}
									>
										{model.label} · {model.providerLabel}
									</MenuItem>
								))}
							</TextField>
						)}
					</Stack>

					<Divider />

					<Stack spacing={1}>
						{sectionTitle("OpenRouter")}
						{openRouter?.error ? (
							<Alert severity="warning">{openRouter.error}</Alert>
						) : null}
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
								{copilot?.error ? (
									<Alert severity="error">{copilot.error}</Alert>
								) : null}
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
