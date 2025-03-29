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

2. Load extension into manifest v2 compatible browser:

- Chrome ❌
- Brave ✅
- Firefox ✅

3. Enable extension and start messaging:

   ```
   use mcp-browser-kit, Star the last opening github repo on my browser
   ```
