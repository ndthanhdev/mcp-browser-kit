import darkWordmark from "@mcp-browser-kit/branding/logos/wordmark-dark-color.svg";
import lightWordmark from "@mcp-browser-kit/branding/logos/wordmark-light-color.svg";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { useColorScheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const brandColors = [
	"primary",
	"secondary",
	"success",
	"warning",
	"error",
] as const;

/** Resolves `system` to the concrete scheme actually being displayed. */
const useIsDark = () => {
	const { mode, systemMode } = useColorScheme();
	if (!mode) {
		return undefined;
	}
	return (mode === "system" ? systemMode : mode) === "dark";
};

/** The brand wordmark, in the variant matching the active colour scheme. */
const Wordmark = () => {
	const isDark = useIsDark();

	return (
		<Box
			component="img"
			src={isDark ? darkWordmark : lightWordmark}
			alt="MCP Browser Kit"
			sx={{
				height: 24,
				flexGrow: 1,
			}}
		/>
	);
};

/** Switches between the light and dark brand palettes. */
const ColorSchemeToggle = () => {
	const { setMode } = useColorScheme();
	const isDark = useIsDark();

	// Undefined until the provider mounts on the client.
	if (isDark === undefined) {
		return null;
	}

	return (
		<IconButton
			color="inherit"
			onClick={() => setMode(isDark ? "light" : "dark")}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? <LightModeIcon /> : <DarkModeIcon />}
		</IconButton>
	);
};

const App = () => (
	<Box
		sx={{
			minHeight: "100vh",
			bgcolor: "background.default",
		}}
	>
		<AppBar position="sticky" color="default" elevation={0}>
			<Toolbar
				variant="dense"
				sx={{
					gap: 1,
				}}
			>
				<Wordmark />
				<ColorSchemeToggle />
			</Toolbar>
		</AppBar>

		<Stack
			spacing={2}
			sx={{
				p: 2,
			}}
		>
			<Typography variant="h6">Brand palette</Typography>

			<Stack
				direction="row"
				spacing={1}
				useFlexGap
				sx={{
					flexWrap: "wrap",
				}}
			>
				{brandColors.map((color) => (
					<Chip key={color} label={color} color={color} size="small" />
				))}
			</Stack>

			<Stack
				direction="row"
				spacing={1}
				useFlexGap
				sx={{
					flexWrap: "wrap",
				}}
			>
				<Button variant="contained">Contained</Button>
				<Button variant="outlined">Outlined</Button>
				<Button variant="text" color="secondary">
					Text
				</Button>
			</Stack>

			<Paper
				variant="outlined"
				sx={{
					p: 2,
				}}
			>
				<Typography variant="body2" color="text.secondary">
					Surfaces, text and dividers all read from the tokens in{" "}
					<code>etc/branding/colors.json</code>.
				</Typography>
			</Paper>

			<Box
				sx={{
					p: 2,
					borderRadius: 1,
					bgcolor: "brand.surfaceElevated",
				}}
			>
				<Typography variant="body2">
					This block uses <code>brand.surfaceElevated</code>, a token with no
					MUI equivalent.{" "}
					<Link
						href="https://github.com/ndthanhdev/mcp-browser-kit"
						sx={{
							color: "brand.link",
						}}
					>
						This link
					</Link>{" "}
					uses <code>brand.link</code>.
				</Typography>
			</Box>
		</Stack>
	</Box>
);

export default App;
