import Box from "@mui/material/Box";
import { Outlet } from "react-router";

/** The panel shell every route renders inside. */
export const SidepanelLayout = () => (
	<Box
		sx={{
			height: "100vh",
			display: "flex",
			flexDirection: "column",
			bgcolor: "background.default",
		}}
	>
		<Outlet />
	</Box>
);
