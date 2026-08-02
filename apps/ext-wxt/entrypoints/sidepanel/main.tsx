import React from "react";
import ReactDom from "react-dom/client";
import { MbkThemeProvider } from "@/theme/mbk-theme-provider";
import App from "./app.tsx";

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDom.createRoot(root).render(
	<React.StrictMode>
		<MbkThemeProvider>
			<App />
		</MbkThemeProvider>
	</React.StrictMode>,
);
