import React from "react";
import ReactDom from "react-dom/client";
import App from "./App.tsx";
import "./style.css";

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDom.createRoot(root).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
