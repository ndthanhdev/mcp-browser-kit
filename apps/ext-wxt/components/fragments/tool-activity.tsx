import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DetailBlock } from "@/components/elements/detail-block";
import { ToolStatusIcon } from "@/components/elements/tool-status-icon";
import type { ThreadItem } from "@/types/thread-item";

export interface ToolActivityProps {
	item: Extract<
		ThreadItem,
		{
			kind: "tool";
		}
	>;
	expanded: boolean;
}

/** One tool call and its result. Expansion is driven entirely by props. */
export const ToolActivity = ({ item, expanded }: ToolActivityProps) => {
	const failed = item.ok === false;

	return (
		<Paper
			variant="outlined"
			sx={{
				borderColor: failed ? "error.main" : "divider",
				bgcolor: "transparent",
			}}
		>
			<Stack
				direction="row"
				spacing={0.5}
				sx={{
					alignItems: "center",
					px: 1,
					py: 0.5,
				}}
			>
				<Box
					sx={{
						display: "flex",
						fontSize: 16,
					}}
				>
					<ToolStatusIcon ok={item.ok} />
				</Box>
				<Typography
					variant="caption"
					sx={{
						flexGrow: 1,
						fontFamily: "monospace",
						color: failed ? "error.main" : "text.secondary",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{item.toolName}
				</Typography>
				<IconButton
					size="small"
					aria-label={expanded ? "Hide tool detail" : "Show tool detail"}
					sx={{
						transform: expanded ? "rotate(180deg)" : "none",
					}}
				>
					<ExpandMoreIcon fontSize="small" />
				</IconButton>
			</Stack>

			<Collapse in={expanded} unmountOnExit>
				<Stack
					spacing={0.5}
					sx={{
						px: 1,
						pb: 1,
					}}
				>
					<DetailBlock label="Arguments" value={item.args} />
					{item.ok === undefined ? null : (
						<DetailBlock
							label={failed ? "Reason" : "Result"}
							value={failed ? item.reason : (item.result ?? "ok")}
						/>
					)}
				</Stack>
			</Collapse>
		</Paper>
	);
};
