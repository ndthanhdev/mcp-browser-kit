# Privacy Policy — MCP Browser Kit

Last updated: 2026-08-02

MCP Browser Kit is an open-source project. This policy covers the browser
extension ("the extension") and the MCP Browser Kit server ("the server") that
you run on your own computer.

The short version: **the extension sends nothing to the developer and nothing to
the internet.** It talks only to software running on your own machine. What
happens to that data afterwards is determined by the AI assistant you choose to
connect, not by this extension.

## What the extension accesses

The extension is a remote control for your browser, driven by an AI assistant
you connect yourself. To do that it accesses:

- **Website content.** The HTML and visible text of a page, and the position and
  labels of elements on it, so the assistant can read the page and click, type
  or scroll on your behalf. This is read only when the assistant requests it, or
  when a page you have open changes while the assistant is watching it.
- **Web browsing activity.** The title, URL, window and active state of your open
  tabs, so the assistant can tell your tabs apart and switch between them.

The extension does **not** access or request your cookies, passwords, form
autofill data, downloads, bookmarks, or browsing history beyond the tabs you
currently have open. It takes no screenshots and records no audio or video.

## Where that data goes

The extension connects only to `localhost` — your own computer — on ports 2769
to 2799. It scans that port range to find the MCP Browser Kit server, then
maintains a WebSocket connection to it. Everything described above travels over
that loopback connection and nowhere else.

The extension makes no requests to the developer, to any analytics or crash
reporting service, to any advertising network, or to any other remote server. It
contains no tracking code. The developer of MCP Browser Kit never receives your
data and has no ability to.

## What happens after that

The server passes the data to whichever MCP client and AI model **you** have
configured. If that model runs on a third-party service, your page content and
tab URLs are sent to that service by your own configuration, and that provider's
privacy policy governs what they do with it. This is the point of the tool, but
it is worth being explicit about: **if you point MCP Browser Kit at a hosted AI
provider, the contents of the pages you expose to it leave your machine.**

For this reason we recommend using a separate browser profile or a dedicated
browser instance with MCP Browser Kit, so that sensitive pages are never in
reach of the assistant. The server also has no authentication yet, so you should
keep ports 21082 and 2769–2799 reachable only from your own device.

## Storage and retention

The extension stores no personal data. It keeps no logs, no history and no
database, and writes nothing to `chrome.storage`. It holds no API keys or
credentials of any kind. Data passes through the extension in memory and is not
retained after it is handed to the local server.

## Selling and sharing

Your data is never sold. It is never transferred to third parties for any
purpose unrelated to the extension's single purpose, never used to determine
creditworthiness or for lending, and never used for advertising.

## Remote code

The extension executes no remote code. All of its code ships inside the
published package and is reviewable in this repository. Messages received from
the local server select from a fixed set of built-in operations; they cannot
introduce new code into the extension or the page.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `tabs` | List your open tabs and their titles and URLs; open, switch to and close tabs at your request; deliver instructions to the right tab. |
| `webNavigation` | Enumerate the frames of a page so content inside iframes can be read and interacted with. |
| Access to all sites | The assistant must be able to act on whatever page you ask about, which can be on any site. Used to read page content and to identify tabs by URL. |

## Source code

MCP Browser Kit is MIT-licensed and developed in the open at
<https://github.com/ndthanhdev/mcp-browser-kit>. Every claim in this policy can
be checked against the source.

## Changes

Material changes to this policy will be published in this file, and its history
is visible in the repository's commit log.

## Contact

Please open an issue at
<https://github.com/ndthanhdev/mcp-browser-kit/issues> for any question about
this policy.
