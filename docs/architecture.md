# L0 - System Overview

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

# L1 - Server Core

```mermaid
---
title: Server Core
---
flowchart LR
  subgraph ServerDriving["Driving"]
    ToolDescriptions
    ServerToolCalls
    ManageChannels
    ServerLifecycle
    ObserveBrowserState
  end

  subgraph ServerCore["Core"]
    subgraph UseCases["Use Cases"]
      ServerToolCallUseCases
      ManageChannelUseCases
      ToolDescriptionUseCases
      ServerLifecycleUseCases
      BrowserStateRegistryUseCases
    end
    ExtensionChannelManager
  end

  subgraph ServerDriven["Driven"]
    ConfigProvider["ConfigProvider"]
    ExtensionChannelProvider
    LoggerProvider["LoggerProvider"]
    FeatureFlagsOutputPort["FeatureFlagsOutputPort"]
  end

  %% From Driving
  ServerToolCalls --> ServerToolCallUseCases
  ToolDescriptions --> ToolDescriptionUseCases
  ManageChannels --> ManageChannelUseCases
  ObserveBrowserState --> BrowserStateRegistryUseCases
  ServerLifecycle --> ServerLifecycleUseCases
  %% From Core
  ServerToolCallUseCases--> ExtensionChannelManager
  ManageChannelUseCases --> ExtensionChannelManager
  ExtensionChannelManager --> ExtensionChannelProvider
  BrowserStateRegistryUseCases --> ExtensionChannelProvider
  ToolDescriptionUseCases --> ConfigProvider
  ServerLifecycleUseCases --> BrowserStateRegistry
  ServerCore -.-> FeatureFlagsOutputPort

```

# L1 - Server

```mermaid
---
title: Server
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

# L1 - Extension Core

```mermaid
---
title: Extension Core
---
flowchart LR
  subgraph Driving["Driving"]
    direction LR
    ExtensionToolCall
    ExtensionLifecycle
    BrowserAgent
  end
  subgraph Core["Core (Use Cases)"]
    direction LR
    ExtensionLifecycleUseCase
    ExtensionToolCallUseCases
    PublishBrowserStateUseCase
    BrowserAgentUseCases
    AgentSessionRegistry
  end
  subgraph Driven["Driven"]
    direction LR
    BrowserDriver
    BrowserStateSource
    ServerChannelProvider
    ServerEventSink
    LlmProvider
    LoggerProvider
    FeatureFlagsOutputPort
    ExtensionLifecycleOutputPort
  end

  Driving --> Core --> Driven
```

## L2 - Extension Tool Calls

```mermaid
---
title: Extension Core — Tool Calls
---
flowchart TB
  subgraph Driving["Driving"]
    ExtensionToolCall
  end
  subgraph Core["Core"]
    ExtensionToolCallUseCases
  end
  subgraph Driven["Driven"]
    BrowserDriver
  end
  ExtensionToolCall --> ExtensionToolCallUseCases
  ExtensionToolCallUseCases --> BrowserDriver
```

## L2 - Browser-State Publishing

```mermaid
---
title: Extension Core — Browser-State Publishing
---
flowchart TB
  subgraph Driving["Driving"]
    ExtensionLifecycle
  end
  subgraph Core["Core"]
    ExtensionLifecycleUseCase
    PublishBrowserStateUseCase
  end
  subgraph Driven["Driven"]
    BrowserStateSource
    BrowserDriver
    ServerEventSink
  end
  ExtensionLifecycle --> ExtensionLifecycleUseCase
  ExtensionLifecycleUseCase --> PublishBrowserStateUseCase
  PublishBrowserStateUseCase --> BrowserStateSource
  PublishBrowserStateUseCase --> BrowserDriver
  PublishBrowserStateUseCase --> ServerEventSink
```

## L2 - Browser Agent

```mermaid
---
title: Extension Core — Browser Agent
---
flowchart TB
  subgraph Driving["Driving"]
    BrowserAgent
  end
  subgraph Core["Core"]
    BrowserAgentUseCases
    AgentSessionRegistry
    ExtensionToolCallUseCases
  end
  subgraph Driven["Driven"]
    LlmProvider
    BrowserDriver
  end
  BrowserAgent --> BrowserAgentUseCases
  BrowserAgentUseCases --> AgentSessionRegistry
  BrowserAgentUseCases --> LlmProvider
  BrowserAgentUseCases --> ExtensionToolCallUseCases
  ExtensionToolCallUseCases --> BrowserDriver
```

# L1 - Extension Architecture

All components grouped by runtime (the deployment "layers"); the channel sub-diagrams below detail
each cross-runtime link. `CoreExtension` internals are in
[Extension Core Architecture](#extension-core-architecture-level-0).

```mermaid
---
title: Extension Architecture
---
flowchart TB
  subgraph AgentUi["apps/ext-wxt sidepanel"]
    direction LR
    AgentApp
    UseAgentClient
  end
  subgraph Background["Background SW"]
    subgraph BgDriving["Driving"]
      direction LR
      ExtensionLifecycle
      ExtensionTrpcController
      AgentRpcController
    end
    subgraph BgCore["Core"]
      CoreExtension
    end
    subgraph BgDriven["Driven"]
      direction LR
      BrowserDriver
      ServerChannelProvider
      ExtensionDrivenLlmProvider
    end
    BgDriving --> BgCore --> BgDriven
  end
  subgraph Tab["Content script (Tab)"]
    direction LR
    TabRpcServer
    TabContentMutationObserver
  end
  Server["MCP Server"]

  AgentUi -->|"runtime.connect: mbk:agent"| Background
  Background <-->|"tab RPC"| Tab
  Background <-->|"tRPC channel"| Server
```

## L2 - Channel — Background ⇄ Tab

```mermaid
---
title: Channel — Background ⇄ Tab
---
flowchart TB
  subgraph BG["Background SW"]
    subgraph Driven["Driven"]
      direction LR
      TabRpcClient
      BrowserStateSource
    end
  end
  subgraph TabRt["Content script (Tab)"]
    TabRpcServer
    TabContentMutationObserver
  end

  TabRpcClient -->|"tabs.sendMessage (defer)"| TabRpcServer
  TabRpcServer -->|"runtime.onMessage (resolve)"| TabRpcClient
  TabContentMutationObserver -->|"mbk.tabContent.changed"| BrowserStateSource
```

## L2 - Channel — Background ⇄ MCP Server

```mermaid
---
title: Channel — Background ⇄ MCP Server
---
flowchart TB
  subgraph BG["Background SW"]
    subgraph Driving["Driving"]
      ExtensionTrpcController
    end
    subgraph Driven["Driven"]
      ServerChannelProvider
    end
  end
  Server["MCP Server"]

  ExtensionTrpcController -->|"tool calls + discovery"| ServerChannelProvider
  ServerChannelProvider <-->|"tRPC channel"| Server
```

## L2 - Browser Agent Architecture

```mermaid
---
title: Browser Agent Architecture
---
flowchart TD
  subgraph AgentUi["apps/ext-wxt sidepanel"]
    AgentApp["ChatPage / useAgentThread"]
  end

  subgraph BackgroundSW["Background service worker"]
    subgraph Driving["Driving"]
      AgentRpcController["AgentRpcController"]
    end
    subgraph Core["Core"]
      BrowserAgentUseCases["BrowserAgentUseCases"]
      AgentSessionRegistry["AgentSessionRegistry"]
      ExtensionToolCallUseCases["ExtensionToolCallUseCases"]
    end
    subgraph Driven["Driven"]
      direction LR
      LlmProvider["LlmProviderOutputPort"]
      BrowserDriver["BrowserDriverOutputPort"]
    end
  end

  AgentApp -->|"createSession / sendMessage / cancel"| AgentRpcController
  AgentRpcController -->|"progress events (per session)"| AgentApp
  AgentRpcController --> BrowserAgentUseCases
  BrowserAgentUseCases -->|"owns N sessions"| AgentSessionRegistry
  BrowserAgentUseCases --> LlmProvider
  BrowserAgentUseCases --> ExtensionToolCallUseCases
  ExtensionToolCallUseCases --> BrowserDriver
```

```mermaid
---
title: LLM Provider Adapter
---
flowchart LR
  subgraph Adapter["extension-driven-llm-provider"]
    Registry["DrivenLlmProvider"]
    subgraph Axes[" "]
      direction TB
      Catalog["ModelCatalog<br/>(what exists)"]
      Auth["AuthStrategy<br/>(how to authenticate)"]
      Factory["ModelFactory<br/>(how to build it)"]
    end
  end
  ModelsDev[("models.dev/api.json")]
  Storage[("storage.local")]

  Registry --> Catalog
  Registry --> Auth
  Registry --> Factory
  Catalog -->|"fetch + ETag"| ModelsDev
  Catalog -->|"pruned cache"| Storage
  Auth -->|"credentials"| Storage
```
