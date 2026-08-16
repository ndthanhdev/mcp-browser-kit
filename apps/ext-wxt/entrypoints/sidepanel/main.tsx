import React from "react";
import ReactDom from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "@/routes/router";
import { MbkThemeProvider } from "@/theme/mbk-theme-provider";

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDom.createRoot(root).render(
	<React.StrictMode>
		<MbkThemeProvider>
			<RouterProvider router={router} />
		</MbkThemeProvider>
	</React.StrictMode>,
);
