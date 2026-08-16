import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

const bounce = keyframes`
	0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
	40% { opacity: 1; transform: translateY(-3px); }
`;

const dotDelays = [
	"0ms",
	"160ms",
	"320ms",
];

/** Shown between `turn-started` and the first assistant text of a turn. */
export const TypingIndicator = () => (
	<Box
		sx={{
			display: "flex",
			alignItems: "center",
			gap: 1,
			px: 1,
		}}
	>
		<Box
			sx={{
				display: "flex",
				gap: 0.5,
			}}
		>
			{dotDelays.map((delay) => (
				<Box
					key={delay}
					sx={{
						width: 6,
						height: 6,
						borderRadius: "50%",
						bgcolor: "text.secondary",
						animation: `${bounce} 1.2s infinite ease-in-out`,
						animationDelay: delay,
					}}
				/>
			))}
		</Box>
		<Typography variant="caption" color="text.secondary">
			Working…
		</Typography>
	</Box>
);
