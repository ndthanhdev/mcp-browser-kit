import type { CatalogModel } from "@mcp-browser-kit/extension-driven-llm-provider";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

export interface ModelCapabilityChipsProps {
	model: CatalogModel;
}

/** e.g. 200000 -> "200K", 1000000 -> "1M". */
const formatContext = (tokens: number): string => {
	if (tokens >= 1_000_000) {
		return `${Math.round(tokens / 100_000) / 10}M`;
	}
	if (tokens >= 1_000) {
		return `${Math.round(tokens / 1_000)}K`;
	}
	return String(tokens);
};

/** models.dev quotes cost in USD per million tokens. */
const formatCost = (input?: number, output?: number): string | undefined => {
	if (input === undefined && output === undefined) {
		return undefined;
	}
	const parts: string[] = [];
	if (input !== undefined) {
		parts.push(`$${input}/M in`);
	}
	if (output !== undefined) {
		parts.push(`$${output}/M out`);
	}
	return parts.join(" · ");
};

/**
 * The facts that actually decide a model choice: how much context it has, what
 * it costs, and whether it reasons.
 *
 * All of it comes from models.dev, so it stays current without a release here.
 * Tool calling is deliberately not shown — every listed model has it, because
 * the catalog drops the ones that don't.
 */
export const ModelCapabilityChips = ({ model }: ModelCapabilityChipsProps) => {
	const cost = formatCost(model.cost?.input, model.cost?.output);

	return (
		<Stack
			direction="row"
			spacing={0.5}
			sx={{
				flexWrap: "wrap",
				gap: 0.5,
			}}
		>
			{model.limit?.context ? (
				<Tooltip title="Context window">
					<Chip
						size="small"
						variant="outlined"
						label={`${formatContext(model.limit.context)} ctx`}
					/>
				</Tooltip>
			) : null}
			{model.reasoning ? (
				<Chip
					size="small"
					variant="outlined"
					color="secondary"
					label="reasoning"
				/>
			) : null}
			{model.attachment ? (
				<Tooltip title="Accepts images and files">
					<Chip size="small" variant="outlined" label="vision" />
				</Tooltip>
			) : null}
			{cost ? (
				<Tooltip title="Cost per million tokens">
					<Chip size="small" variant="outlined" label={cost} />
				</Tooltip>
			) : null}
		</Stack>
	);
};
