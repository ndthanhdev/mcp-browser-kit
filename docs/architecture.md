- [Overall Architecture](#overall-architecture)
- [M3 Architecture](#m3-architecture)
- [M2 Architecture](#m2-architecture)

# Overall Architecture
```mermaid
flowchart TD
  McpServer
  subgraph Server
    Tools
    ExtensionDriver

    Tools--> ExtensionDriver
  end

  McpServer-->Tools

  subgraph Extension
    ExtensionTool
    BrowserDriver

    ExtensionTool--> BrowserDriver
  end
  ExtensionDriver --> ExtensionTool
```

# M3 Architecture


```mermaid
flowchart TD
  subgraph ExtensionDriver["ExtensionDriver (M3)"]
    SWRpcClient
  end
  subgraph Tab
    TabRpcServer
    SWRpcClient
  end
  subgraph BrowserDriver["BrowserDriver (M3)"]
    TabRpcClient
  end
  SWRpcServer
  SWRpcServer
  subgraph Extension["Extension (M3)"]
    ExtensionTool
    BrowserDriver
  end
  Tab
  SWRpcClient --> SWRpcServer
  SWRpcServer --> ExtensionTool
  ExtensionTool --> BrowserDriver
  TabRpcClient --> TabRpcServer
```

# M2 Architecture
