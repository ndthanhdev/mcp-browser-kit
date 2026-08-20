import SearchIcon from "@mui/icons-material/Search";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDeferredValue, useMemo, useState } from "react";
import type { ProviderRow } from "@/hooks/use-agent-settings";

export interface ProviderCredentialListProps {
	providers: ProviderRow[];
	/** Rendered inside the GitHub Copilot row instead of an API key field. */
	copilotSlot?: React.ReactNode;
	/** Whether the Copilot row should appear at all. */
	copilotEnabled: boolean;
	onSaveApiKey: (providerId: string, apiKey: string) => void;
	onSignOut: (providerId: string) => void;
	onRemoveCustom: (providerId: string) => void;
}

const COPILOT_ID = "github-copilot";

/** One provider's credential row. Collapsed until opened. */
const ProviderRowItem = ({
	provider,
	copilotSlot,
	onSaveApiKey,
	onSignOut,
	onRemoveCustom,
}: {
	provider: ProviderRow;
	copilotSlot?: React.ReactNode;
	onSaveApiKey: (providerId: string, apiKey: string) => void;
	onSignOut: (providerId: string) => void;
	onRemoveCustom: (providerId: string) => void;
}) => {
	const [draft, setDraft] = useState("");

	return (
		<Accordion disableGutters elevation={0} square>
			<AccordionSummary>
				<Stack
					direction="row"
					spacing={1}
					sx={{
						alignItems: "center",
						width: "100%",
					}}
				>
					<Typography
						variant="body2"
						sx={{
							flexGrow: 1,
						}}
						noWrap
					>
						{provider.name}
					</Typography>
					{provider.custom ? (
						<Chip size="small" variant="outlined" label="custom" />
					) : null}
					{provider.configured ? (
						<Chip
							size="small"
							color="success"
							variant="outlined"
							label="ready"
						/>
					) : null}
					<Typography variant="caption" color="text.secondary">
						{provider.modelCount}
					</Typography>
				</Stack>
			</AccordionSummary>
			<AccordionDetails>
				<Stack spacing={1}>
					{provider.doc ? (
						<Link
							variant="caption"
							href={provider.doc}
							target="_blank"
							rel="noreferrer"
						>
							Provider documentation
						</Link>
					) : null}

					{provider.id === COPILOT_ID ? (
						copilotSlot
					) : (
						<>
							<TextField
								size="small"
								type="password"
								label="API key"
								value={draft}
								placeholder={provider.configured ? "•••••• (stored)" : ""}
								onChange={(event) => setDraft(event.target.value)}
								onBlur={() => {
									if (draft) {
										onSaveApiKey(provider.id, draft);
										setDraft("");
									}
								}}
								helperText="Saved when the field loses focus."
							/>
							<Stack direction="row" spacing={1}>
								{provider.configured ? (
									<Button size="small" onClick={() => onSignOut(provider.id)}>
										Remove key
									</Button>
								) : null}
								{provider.custom ? (
									<Button
										size="small"
										color="error"
										onClick={() => onRemoveCustom(provider.id)}
									>
										Delete provider
									</Button>
								) : null}
							</Stack>
						</>
					)}
				</Stack>
			</AccordionDetails>
		</Accordion>
	);
};

/**
 * The provider list.
 *
 * Search-first for the same reason as the model picker: ~190 providers is far
 * past what a scrollable list is usable for. Configured providers are pinned to
 * the top, since those are the ones a returning user came to change.
 */
export const ProviderCredentialList = ({
	providers,
	copilotSlot,
	copilotEnabled,
	onSaveApiKey,
	onSignOut,
	onRemoveCustom,
}: ProviderCredentialListProps) => {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const visible = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		const matches = providers.filter((provider) => {
			if (provider.id === COPILOT_ID && !copilotEnabled) {
				return false;
			}
			return (
				!needle ||
				provider.name.toLowerCase().includes(needle) ||
				provider.id.toLowerCase().includes(needle)
			);
		});
		// Configured first, then alphabetical — `providers` arrives sorted by name.
		return [
			...matches.filter((provider) => provider.configured),
			...matches.filter((provider) => !provider.configured),
		].slice(0, 60);
	}, [
		providers,
		deferredQuery,
		copilotEnabled,
	]);

	return (
		<Stack spacing={1}>
			<TextField
				size="small"
				placeholder={`Search ${providers.length} providers`}
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon fontSize="small" />
							</InputAdornment>
						),
					},
				}}
			/>

			{providers.length === 0 ? (
				<Alert severity="info">
					The provider list is still loading from models.dev.
				</Alert>
			) : null}

			{visible.map((provider) => (
				<ProviderRowItem
					key={provider.id}
					provider={provider}
					copilotSlot={copilotSlot}
					onSaveApiKey={onSaveApiKey}
					onSignOut={onSignOut}
					onRemoveCustom={onRemoveCustom}
				/>
			))}
		</Stack>
	);
};
