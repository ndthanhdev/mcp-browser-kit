# MCP Browser Kit


[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)


An MCP Server for interacting with manifest v2 compatible browsers.

https://github.com/user-attachments/assets/1fbf87fd-06d1-42bf-a06f-cc2bbdf375a8


## Usage

1. Add MCP Browser Kit to your MCP Client:

   ```json
   {
   	"mcpServers": {
   		"mcp-browser-kit": {
   			"command": "npx",
   			"args": ["@mcp-browser-kit/server"]
   		}
   	}
   }
   ```

2. Download and unzip the latest [MCP Browser Kit Extension](https://github.com/ndthanhdev/mcp-browser-kit/releases)
3. [Load extension](#load-extension) into a manifest v2 compatible browser:

   - Chrome ❌
   - Brave ✅
   - Firefox ✅

4. Enable extension and start messaging on your MCP Client:

   ```
   use mcp-browser-kit, Star the last opening github repo on my browser
   ```

## Load Extension

- Brave
  1.  Open `brave://extensions/`
  2.  Enable `Developer mode`
  3.  Click `Load unpacked`
  4.  Select the `extension` folder
- Firefox
  1.  Open `about:debugging#/runtime/this-firefox`
  2.  Click `Load Temporary Add-on`
  3.  Select the `manifest.json` file in the `extension` folder
