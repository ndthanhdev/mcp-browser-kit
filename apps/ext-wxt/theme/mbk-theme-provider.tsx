import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from "@/theme/theme";

/**
 * The single styling root for every extension page. Each entrypoint
 * (sidepanel today; popup or options later) wraps its tree in this so they all
 * share one brand theme and one baseline.
 *
 * Note there is deliberately no `InitColorSchemeScript`: MUI's flash-prevention
 * helper renders an inline `<script>`, which the MV3 content security policy
 * (`script-src 'self'`) blocks. Dark-mode users may see a brief light flash
 * while the page mounts.
 */
export const MbkThemeProvider = ({ children }: { children: ReactNode }) => (
	<ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
		<CssBaseline />
		{children}
	</ThemeProvider>
);
