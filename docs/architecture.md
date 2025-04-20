# M3


```mermaid
flowchart TD
  Mcp
  subgraph "M3"
    SW["Service Worker"]
    Tab["Tab"]
  end

  Mcp --RPC 1--> SW
  SW --RPC 2--> Tab
```