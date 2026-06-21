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
  Extensions -->|"browser state events"| McpServer
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
    ObserveBrowserState
  end

  subgraph ServerCore["Core"]
    subgraph UseCases["Use Cases"]
      ServerToolCallUseCases
      ManageChannelUseCases
      ToolDescriptionUseCases
    end
    ExtensionChannelManager
    BrowserStateRegistry
  end

  subgraph ServerDriven["Driven"]
    ConfigProvider["ConfigProvider"]
    ExtensionChannelProvider
    LoggerProvider["LoggerProvider"]
  end

  %% From Driving
  ServerToolCalls --> ServerToolCallUseCases
  ToolDescriptions --> ToolDescriptionUseCases
  ManageChannels --> ManageChannelUseCases
  ObserveBrowserState --> BrowserStateRegistry
  %% From Core
  ServerToolCallUseCases--> ExtensionChannelManager
  ManageChannelUseCases --> ExtensionChannelManager
  ExtensionChannelManager --> ExtensionChannelProvider
  BrowserStateRegistry --> ExtensionChannelProvider
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
    BrowserAgent
    ExtensionBootstrap
  end
  subgraph ExtensionCore["Core"]
    subgraph UseCases["Use Cases"]
      ExtensionToolCallUseCases
      PublishBrowserStateUseCase
      BrowserAgentUseCases
    end
  end
  subgraph Driven["Driven"]
    BrowserDriver
    BrowserStateSource
    LlmProvider
    subgraph ExtensionDrivenServerChannelProvider["ExtensionDrivenServerChannelProvider (adapter)"]
      ServerChannelProvider
      ServerEventSink
    end
    LoggerProvider
  end

  %% From Driving
  ExtensionToolCall --> ExtensionToolCallUseCases
  BrowserAgent --> BrowserAgentUseCases
  ExtensionBootstrap --> PublishBrowserStateUseCase
  %% From Core
  ExtensionToolCallUseCases --> BrowserDriver
  BrowserAgentUseCases --> LlmProvider
  BrowserAgentUseCases --> BrowserDriver
  %% Observability
  BrowserStateSource --> PublishBrowserStateUseCase
  PublishBrowserStateUseCase --> BrowserDriver
  PublishBrowserStateUseCase --> ServerEventSink

  %% Planned (not yet implemented)
  classDef planned stroke-dasharray:5 5,stroke:#999,color:#999;
  class BrowserAgent,BrowserAgentUseCases,LlmProvider planned;
```

# Extension Architecture (Level 0)

```mermaid
---
title: M3 Architecture
---
flowchart TD
  subgraph Background["Background"]
    ExtensionBootstrap["ExtensionBootstrap"]
    ExtensionTrpcController["ExtensionTrpcController"]
    CoreExtension
  end

  subgraph Tab
    TabRpcServer
    TabContentMutationObserver
  end
  subgraph BrowserDriver["BrowserDriver"]
    TabRpcClient
    BrowserStateSource
  end

  subgraph ExtensionDriving["ExtensionDriving"]
    ExtensionToolCalls
  end

  subgraph ExtensionDriven["ExtensionDriven"]
    BrowserDriver
    ServerChannelProvider
    LlmProvider
  end

  subgraph CoreExtension["CoreExtension"]
    ExtensionDriving
    Core
    ExtensionDriven
  end

  ExtensionBootstrap --> ExtensionTrpcController
  ExtensionBootstrap -->|"publish browser state"| Core
  ExtensionBootstrap -->|"discover servers"| ServerChannelProvider
  ExtensionTrpcController -----> ServerChannelProvider
  ExtensionTrpcController ---> ExtensionToolCalls
  ExtensionDriving --> Core
  Core --> ExtensionDriven
  TabRpcClient --> TabRpcServer
  TabContentMutationObserver -->|"mbk.tabContent.changed"| BrowserStateSource

  %% Planned (not yet implemented)
  classDef planned stroke-dasharray:5 5,stroke:#999,color:#999;
  class LlmProvider planned;
```
