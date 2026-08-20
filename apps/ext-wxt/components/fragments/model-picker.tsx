import type { CatalogEntry } from "@mcp-browser-kit/extension-driven-llm-provider";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDeferredValue, useMemo, useState } from "react";
import { ModelCapabilityChips } from "@/components/elements/model-capability-chips";

export interface ModelPickerProps {
	/** Search over the catalog. Returns at most `limit` entries. */
	search: (query: string, limit?: number) => CatalogEntry[];
	/** Composite `"<provider>:<model>"` id currently selected. */
	selectedModel?: string;
	/** Restrict to providers the user has credentials for. */
	configuredProviderIds: string[];
	onSelect: (providerId: string, modelId: string) => void;
}

/** Enough to scroll through; more would just cost render time. */
const RESULT_LIMIT = 60;

/**
 * Search-first picker over the models.dev catalog.
 *
 * A dropdown does not work at this scale — ~5,800 models across ~190 providers.
 * Results are capped, and the query is deferred so typing stays responsive while
 * React re-renders the list.
 *
 * Defaults to models the user can actually call. Browsing everything is still
 * one checkbox away, because deciding which provider to sign up for means
 * looking at models you don't have access to yet.
 */
export const ModelPicker = ({
	search,
	selectedModel,
	configuredProviderIds,
	onSelect,
}: ModelPickerProps) => {
	const [query, setQuery] = useState("");
	const [onlyConfigured, setOnlyConfigured] = useState(true);
	const deferredQuery = useDeferredValue(query);

	const results = useMemo(() => {
		const configured = new Set(configuredProviderIds);
		const found = search(deferredQuery, RESULT_LIMIT * 4);
		const filtered = onlyConfigured
			? found.filter((entry) => configured.has(entry.provider.id))
			: found;
		return filtered.slice(0, RESULT_LIMIT);
	}, [
		search,
		deferredQuery,
		onlyConfigured,
		configuredProviderIds,
	]);

	return (
		<Stack spacing={1}>
			<TextField
				size="small"
				placeholder="Search models and providers"
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

			<Typography
				variant="caption"
				color="text.secondary"
				component="button"
				onClick={() => setOnlyConfigured((current) => !current)}
				sx={{
					background: "none",
					border: 0,
					cursor: "pointer",
					textAlign: "left",
					p: 0,
					textDecoration: "underline",
				}}
			>
				{onlyConfigured
					? "Showing models you can use — show all providers"
					: "Showing all providers — show only what you can use"}
			</Typography>

			{results.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					{onlyConfigured
						? "No models available. Add credentials for a provider below."
						: "Nothing matched that search."}
				</Typography>
			) : (
				<List
					dense
					disablePadding
					sx={{
						maxHeight: 280,
						overflowY: "auto",
					}}
				>
					{results.map((entry) => {
						const compositeId = `${entry.provider.id}:${entry.model.id}`;
						return (
							<ListItemButton
								key={compositeId}
								selected={compositeId === selectedModel}
								onClick={() => onSelect(entry.provider.id, entry.model.id)}
								sx={{
									display: "block",
									borderRadius: 1,
								}}
							>
								<Typography variant="body2" noWrap>
									{entry.model.name}
								</Typography>
								<Typography variant="caption" color="text.secondary" noWrap>
									{entry.provider.name}
								</Typography>
								<Box
									sx={{
										mt: 0.5,
									}}
								>
									<ModelCapabilityChips model={entry.model} />
								</Box>
							</ListItemButton>
						);
					})}
				</List>
			)}
		</Stack>
	);
};
