import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export interface DetailBlockProps {
	label: string;
	/** Strings render as-is; anything else is pretty-printed as JSON. */
	value: unknown;
}

const format = (value: unknown) => {
	if (typeof value === "string") {
		return value;
	}
	return JSON.stringify(value, null, 2);
};

/** Labelled monospace block for inspecting a payload. */
export const DetailBlock = ({ label, value }: DetailBlockProps) => (
	<>
		<Typography variant="caption" color="text.secondary">
			{label}
		</Typography>
		<Box
			component="pre"
			sx={{
				m: 0,
				p: 1,
				borderRadius: 1,
				bgcolor: "brand.surfaceElevated",
				fontSize: 11,
				overflowX: "auto",
			}}
		>
			{format(value)}
		</Box>
	</>
);
