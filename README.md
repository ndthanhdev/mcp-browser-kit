# MCP Browser Kit

An MCP Server for interacting with manifest v2 compatible browsers.

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

2. Download and extract [MCP Browser Kit Extension](https://github.com/ndthanhdev/mcp-browser-kit/releases/download/v2.0.0/extension.zip)
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
