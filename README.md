# MCP Browser Kit

A Model Control Protocol (MCP) Server for interacting with manifest v2 compatible browsers.

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

2. Download and load [MCP Browser Kit Extension](https://github.com/ndthanhdev/mcp-browser-kit/releases/download/v1.0.0/extension.zip) into a manifest v2 compatible browser:

- Chrome ❌
- Brave ✅
- Firefox ✅

3. Enable extension and start messaging on your MCP Client:

   ```
   use mcp-browser-kit, Star the last opening github repo on my browser
   ```
