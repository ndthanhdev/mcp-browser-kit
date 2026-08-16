import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import Button from "@mui/material/Button";
import { EmptyState } from "@/components/elements/empty-state";
import { hrefs } from "@/routes/paths";

/**
 * Fallback for an unmatched or failed route. React Router's default error
 * screen assumes a full-width page and is unreadable in a ~350px panel.
 */
export const RouteErrorScreen = () => (
	<EmptyState
		icon={<ReportProblemIcon fontSize="inherit" />}
		title="This page could not be opened"
		description="The sidepanel navigated somewhere that does not exist."
		action={
			<Button size="small" href={hrefs.home}>
				Back to chat
			</Button>
		}
	/>
);
