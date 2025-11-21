# MCP Browser Kit

[![Build and Test](https://github.com/ndthanhdev/mcp-browser-kit/actions/workflows/build-test.yml/badge.svg)](https://github.com/ndthanhdev/mcp-browser-kit/actions/workflows/build-test.yml)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)
[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/ndthanhdev/mcp-browser-kit)](https://archestra.ai/mcp-catalog/ndthanhdev__mcp-browser-kit)

> 🚀 **On the `main` branch?** You're viewing the bleeding-edge dev docs! For other versions, check out the `release/*` branches.

An MCP Server that enables AI assistants to interact with your local browsers.

https://github.com/user-attachments/assets/1fbf87fd-06d1-42bf-a06f-cc2bbdf375a8

## Usage

1. Add MCP Browser Kit to your MCP Client:

   ```json
   {
   	"mcpServers": {
   		"browser-kit": {
   			"command": "npx",
   			"args": ["@mcp-browser-kit/server@latest"]
   		}
   	}
   }
   ```

2. Choose the right extension build for your browser:

   - Check the [Compatibility table](#compatibility-table) below to see which build (M2 or M3) is compatible with your browser
   - Note that M2 builds offer more functionality than M3 builds, so prefer M2 if your browser supports both

3. Download the latest compatible build from [The Latest Release](https://github.com/ndthanhdev/mcp-browser-kit/releases/latest).

4. [Load the extension](#load-extension) into a compatible browser and enable it.

5. Refresh open tabs to ensure extension scripts are loaded.

6. Start messaging on your MCP Client:

   ```
   Use browser-kit, star the last open GitHub repo on my browser
   ```

7. Optional, check [User Notes](#user-notes) for more information.

## Compatibility table

> The M2 build supports more functionalities than the M3 build.
> Extension file name patterns:
> - M2 build:
>   - Chromium: `mcp_browser_kit_m2-<version>.zip` (e.g., `mcp_browser_kit_m2-5.0.0.zip`)
>   - Firefox: `mcp_browser_kit_m2-<version>.xpi` (e.g., `mcp_browser_kit_m2-5.0.0.xpi`)
> - M3 build: `mcp_browser_kit_m3-<version>.zip` (e.g., `mcp_browser_kit_m3-5.0.0.zip`)

| Browser | M2 build | M3 build |
| ------- | -------- | -------- |
| Chrome  | ❌       | ✅       |
| Brave   | ✅       | ✅       |
| Edge    | ✅       | ✅       |
| Firefox | ✅       | ❌       |
| Safari  | ✅       | ❌       |

## Load Extension

- Chromium-based browsers (Chrome, Brave, Edge)
  1.  Unzip the downloaded `.zip` file
  2.  Open [chrome://extensions/](chrome://extensions/)
  3.  Enable `Developer mode`
  4.  Click `Load unpacked`
  5.  Select the unpacked extension folder
- Firefox
  1.  Open [about:addons](about:addons)
  2.  Click the gear icon and select `Install Add-on From File`
  3.  Select the downloaded `.xpi` file
- Safari
  1.  Unzip the downloaded `.zip` file
  2.  Open `Develop > Show Extension Builder`
  3.  Click `+` and select `Add Extension`
  4.  Select the unpacked extension folder
  5.  Click `Install` to install the extension

# User Notes

> **Note for Alpha stage**: Consider using a separate browser profile or dedicated browser instance with this MCP to prevent sensitive data from being unintentionally exposed to AI model providers.

> **Security**: BrowserKit currently lacks authentication for incoming requests. Keep ports 59089 and 2769-2799 on your device network only.
