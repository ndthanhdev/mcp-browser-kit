import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

/** Centred placeholder for a view with nothing to show yet. */
export const EmptyState = ({
	icon,
	title,
	description,
	action,
}: EmptyStateProps) => (
	<Box
		sx={{
			flex: 1,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			textAlign: "center",
			gap: 1,
			p: 4,
			color: "text.secondary",
		}}
	>
		<Box
			sx={{
				fontSize: 40,
				lineHeight: 0,
				opacity: 0.6,
			}}
		>
			{icon}
		</Box>
		<Typography variant="subtitle2" color="text.primary">
			{title}
		</Typography>
		{description ? (
			<Typography variant="body2">{description}</Typography>
		) : null}
		{action}
	</Box>
);
