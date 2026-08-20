import type {
	CatalogEntry,
	CustomProvider,
	ProbeResult,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { CopilotSignInCard } from "@/components/fragments/copilot-sign-in-card";
import { CustomProviderForm } from "@/components/fragments/custom-provider-form";
import { ModelPicker } from "@/components/fragments/model-picker";
import { ProviderCredentialList } from "@/components/fragments/provider-credential-list";
import type {
	CatalogStatus,
	CopilotSignInState,
	ProviderRow,
} from "@/hooks/use-agent-settings";

export interface SettingsScreenProps {
	backHref: string;
	providers: ProviderRow[];
	configuredProviderIds: string[];
	selectedModel?: string;
	catalogStatus: CatalogStatus;
	catalogError?: string;
	copilotEnabled: boolean;
	copilotAccount?: string;
	copilotConfigured: boolean;
	copilotSignIn: CopilotSignInState;
	search: (query: string, limit?: number) => CatalogEntry[];
	onRetryCatalog: () => void;
	onSaveApiKey: (providerId: string, apiKey: string) => void;
	onSelectModel: (providerId: string, modelId: string) => void;
	onSignOut: (providerId: string) => void;
	onProbeCustom: (baseUrl: string, apiKey?: string) => Promise<ProbeResult>;
	onSaveCustom: (provider: CustomProvider, apiKey?: string) => void;
	onRemoveCustom: (providerId: string) => void;
	onCopilotSignIn: () => void;
	onCopilotCancel: () => void;
}

const sectionTitle = (text: string) => (
	<Typography variant="subtitle2" color="text.secondary">
		{text}
	</Typography>
);

/** Provider credentials and model selection, over the models.dev registry. */
export const SettingsScreen = ({
	backHref,
	providers,
	configuredProviderIds,
	selectedModel,
	catalogStatus,
	catalogError,
	copilotEnabled,
	copilotAccount,
	copilotConfigured,
	copilotSignIn,
	search,
	onRetryCatalog,
	onSaveApiKey,
	onSelectModel,
	onSignOut,
	onProbeCustom,
	onSaveCustom,
	onRemoveCustom,
	onCopilotSignIn,
	onCopilotCancel,
}: SettingsScreenProps) => (
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

		{/* The catalog is fetched at runtime, so the picker really is empty until
		    it lands. Say so rather than showing an empty list that reads as
		    "no providers exist". */}
		{catalogStatus === "loading" ? <LinearProgress /> : null}

		<Box
			sx={{
				overflowY: "auto",
				p: 2,
			}}
		>
			<Stack spacing={3}>
				{catalogStatus === "error" ? (
					<Alert
						severity="warning"
						action={
							<Button size="small" onClick={onRetryCatalog}>
								Retry
							</Button>
						}
					>
						Could not load the model list from models.dev.
						{catalogError ? ` ${catalogError}` : ""}
					</Alert>
				) : null}

				<Stack spacing={1}>
					{sectionTitle("Model")}
					<ModelPicker
						search={search}
						selectedModel={selectedModel}
						configuredProviderIds={configuredProviderIds}
						onSelect={onSelectModel}
					/>
				</Stack>

				<Divider />

				<Stack spacing={1}>
					{sectionTitle("Providers")}
					{copilotEnabled ? (
						<Alert severity="warning">
							GitHub publishes no third-party API for Copilot. Signing in below
							authenticates as an editor would, which is contrary to the Copilot
							terms of service and may get your account rate-limited or flagged.
						</Alert>
					) : null}
					<ProviderCredentialList
						providers={providers}
						copilotEnabled={copilotEnabled}
						copilotSlot={
							<CopilotSignInCard
								state={copilotSignIn}
								login={copilotAccount}
								signedIn={copilotConfigured}
								onSignIn={onCopilotSignIn}
								onCancel={onCopilotCancel}
								onSignOut={() => onSignOut("github-copilot")}
							/>
						}
						onSaveApiKey={onSaveApiKey}
						onSignOut={onSignOut}
						onRemoveCustom={onRemoveCustom}
					/>
				</Stack>

				<Divider />

				<Stack spacing={1}>
					{sectionTitle("Add a custom provider")}
					<CustomProviderForm
						takenIds={providers.map((provider) => provider.id)}
						onProbe={onProbeCustom}
						onSave={onSaveCustom}
					/>
				</Stack>
			</Stack>
		</Box>
	</>
);
