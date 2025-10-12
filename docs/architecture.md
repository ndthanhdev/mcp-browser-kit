- [System Overview](#system-overview)
- [Server Core Architecture (Level 0)](#server-core-architecture-level-0)
- [Server Architecture (Level 0)](#server-architecture-level-0)
- [Extension Core Architecture (Level 0)](#extension-core-architecture-level-0)
- [Extension Architecture (Level 0)](#extension-architecture-level-0)

# System Overview

```mermaid
---
title: System Overview
---
flowchart TB
  AgentHost["Agent Host"]
  McpServer["Mcp Server (Browser Kit)"]
  Extensions
  Browser

  subgraph Browser
    Windows
    Tabs
    Extensions["Extension (Browser Kit)"]
  end

  AgentHost -.- McpServer
  McpServer -.-|"n-n"| Extensions
  Extensions -.-|"1-n"| Tabs
  Extensions -.- Windows
  Windows -.-|"1-n"| Tabs
```

# Server Core Architecture (Level 0)

```mermaid
---
title: Server Core Architecture
---
flowchart TD
  subgraph ServerDriving["Driving"]
    ServerToolCalls
    ManageChannels
    ToolDescriptions
  end

  subgraph ServerCore["Core"]
    subgraph UseCases["Use Cases"]
      ServerToolCallUseCases
      ManageChannelUseCases
      ToolDescriptionUseCases
    end
    ExtensionChannelManager
  end

  subgraph ServerDriven["Driven"]
    ExtensionDriver
    ConfigProvider["ConfigProvider"]
    ExtensionChannelProvider
    LoggerProvider["LoggerProvider"]
  end

  %% From Driving
  ServerToolCalls --> ServerToolCallUseCases
  ToolDescriptions --> ToolDescriptionUseCases
  ManageChannels --> ManageChannelUseCases
  %% From Core
  ServerToolCallUseCases --"x"--> ExtensionDriver
  ServerToolCallUseCases--> ExtensionChannelManager
  ManageChannelUseCases --> ExtensionChannelManager
  ExtensionChannelManager --> ExtensionChannelProvider
  ToolDescriptionUseCases --> ConfigProvider

```

# Server Architecture (Level 0)

```mermaid
---
title: Server Architecture (Level 0)
---
flowchart TD
  McpServerController
  subgraph ServerDriving["Driving"]
    ServerToolCalls
  end
  subgraph ServerCore["Core"]

  end
  subgraph ServerDriven["Driven"]
    subgraph ExtensionChannelProviderOutputPort
      ServerTrpcChannelProvider
    end
  end
  subgraph CoreServer
    ServerDriving
    ServerCore
    ServerDriven
  end

  %% From Driving
  ServerDriving --> ServerCore
  %% From Core
  ServerCore --> ServerDriven
  %% From Controller
  McpServerController --> ServerToolCalls
  McpServerController --> ExtensionChannelProviderOutputPort
```

# Extension Core Architecture (Level 0)

```mermaid
---
title: Extension Core Architecture
---
flowchart TD
  subgraph Driving["Driving"]
    ExtensionToolCall
    ManageChannels
  end
  subgraph ExtensionCore["Core"]
    subgraph UseCases["Use Cases"]
      ExtensionToolCallUseCases
      ManageChannelUseCases
    end
    ServerChannelManager
  end
  subgraph Driven["Driven"]
    BrowserDriver
    ServerChannelProvider
    LoggerProvider
  end

  %% From Driving
  ExtensionToolCall --> ExtensionToolCallUseCases
  ManageChannels --> ManageChannelUseCases
  %% From Core
  ExtensionToolCallUseCases --> BrowserDriver
  ExtensionToolCallUseCases --> ServerChannelManager
  ManageChannelUseCases --> ServerChannelManager
  ServerChannelManager --> ServerChannelProvider
```

# Extension Architecture (Level 0)

```mermaid
---
title: M3 Architecture
---
flowchart TD
  subgraph Background["Background"]
    ExtensionTrpcController["ExtensionTrpcController"]
    CoreExtension
  end

  subgraph Tab
    TabRpcServer
  end
  subgraph BrowserDriver["BrowserDriver"]
    TabRpcClient
  end

  subgraph ExtensionDriving["ExtensionDriving"]
    ManageChannels
    ExtensionToolCalls
  end

  subgraph ExtensionDriven["ExtensionDriven"]
    BrowserDriver
    ServerChannelProvider
  end

  subgraph CoreExtension["CoreExtension"]
    ExtensionDriving
    Core
    ExtensionDriven
  end

  ExtensionTrpcController -----> ServerChannelProvider
  ExtensionTrpcController ---> ExtensionToolCalls
  ExtensionDriving --> Core
  Core --> ExtensionDriven
  TabRpcClient --> TabRpcServer
```
