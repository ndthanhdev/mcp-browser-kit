# MCP Browser Kit

[![CI](https://github.com/ndthanhdev/mcp-browser-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/ndthanhdev/mcp-browser-kit/actions/workflows/ci.yml) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

An MCP Server that enables AI assistants to interact with your local browsers.

> **Note**: Consider using a separate browser profile or dedicated browser instance with this MCP to prevent sensitive data from being unintentionally exposed to AI model providers.

https://github.com/user-attachments/assets/1fbf87fd-06d1-42bf-a06f-cc2bbdf375a8

## Usage

1. Add MCP Browser Kit to your MCP Client:

   ```json
   {
   	"mcpServers": {
   		"browser-kit": {
   			"command": "npx",
   			"args": ["@mcp-browser-kit/server"]
   		}
   	}
   }
   ```

2. Choose the right extension build for your browser:

   - Check the [Compatibility table](#compatibility-table) below to see which build (M2 or M3) is compatible with your browser
   - Note that M2 builds offer more functionality than M3 builds, so prefer M2 if your browser supports both

3. Download and unzip the latest compatible build from [Releases page](https://github.com/ndthanhdev/mcp-browser-kit/releases).

4. [Load the extension](#load-extension) into a compatible browser and enable it.

5. Refresh open tabs to ensure extension scripts are loaded.

6. Start messaging on your MCP Client:

   ```
   Use browser-kit, star the last open GitHub repo on my browser
   ```

## Compatibility table

> The M2 build supports more functionalities than the M3 build.

> Extension file name patterns:
>
> - M2 build: `mcp_browser_kit_m2-[version].zip` (e.g., `mcp_browser_kit_m2-5.0.0.zip`)
> - M3 build: `mcp_browser_kit_m3-[version].zip` (e.g., `mcp_browser_kit_m3-5.0.0.zip`)

| Browser | M2 build | M3 build |
| ------- | -------- | -------- |
| Chrome  | ❌       | ✅       |
| Brave   | ✅       | ✅       |
| Edge    | ✅       | ✅       |
| Firefox | ✅       | ❌       |
| Safari  | ✅       | ❌       |

## Load Extension

- Chromium-based browsers (Chrome, Brave, Edge)
  1.  Open [chrome://extensions/](chrome://extensions/)
  2.  Enable `Developer mode`
  3.  Click `Load unpacked`
  4.  Select the unpacked extension folder
- Firefox
  1.  Open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
  2.  Click `Load Temporary Add-on`
  3.  Select the `manifest.json` file in the unpacked extension folder
- Safari
  1.  Open `Develop > Show Extension Builder`
  2.  Click `+` and select `Add Extension`
  3.  Select the unpacked extension folder
  4.  Click `Install` to install the extension
