---
name: hexagonal-inversify-di
description: Use when adding or modifying packages, defining ports, implementing adapters, writing use cases, or wiring dependencies in this monorepo. Covers the Hexagonal (Ports & Adapters) architecture + InversifyJS conventions used across core-*, *-driving-*, *-driven-*, helper-* packages and app composition roots.
---

# Hexagonal + InversifyJS DI Pattern

This monorepo uses **Hexagonal architecture (Ports & Adapters)** wired with **InversifyJS**. Every package's role is encoded in its name prefix, and dependency wiring follows a strict, repeatable recipe.

## When to Use This Skill

Load this skill when the task involves:

- Creating a new package under `packages/`
- Adding or modifying a port (interface + token) in a `core-*` package
- Implementing a use case inside `core-*`
- Implementing a driven (secondary) or driving (primary) adapter
- Editing an app composition root (`apps/*/src/services/container.ts`, `apps/*/src/bootstrap-*.ts`, `apps/*/src/main.ts`)
- Any question about `@injectable`, `@inject`, `Container`, bindings, or scopes in this repo

## Architecture Map

| Prefix            | Role                                                    | May depend on                   |
| ----------------- | ------------------------------------------------------- | ------------------------------- |
| `core-*`          | Domain. Use cases + port definitions (`input-ports/`, `output-ports/`) | `types`, `core-utils`           |
| `*-driving-*`     | **Primary adapter.** Drives the core inward (e.g. HTTP/MCP/RPC entrypoints) | relevant `core-*`, `types`, `helper-*` |
| `*-driven-*`      | **Secondary adapter.** Driven by the core outward (DBs, external services, loggers) | relevant `core-*`, `types`, `helper-*` |
| `helper-*`        | Shared utilities/mixins used by adapters                | `types`                         |
| `types`           | Pure type-only contracts. **No DI, no runtime code.**   | nothing                         |

Rule of thumb: **adapters depend on `core-*` (where the port lives), never directly on `types`** when a port exists. Core depends only on `types` and `core-utils`.

## Core Conventions

### 1. DI library

- **InversifyJS** + `reflect-metadata`
- Import `reflect-metadata` once per runtime entrypoint (already handled in existing apps)

### 2. Dual identifier trick (ports)

A port is an interface **and** a Symbol sharing the same name. TypeScript merges the declarations, so consumers write `@inject(FooPort) private foo: FooPort`.

```ts
// packages/core-<name>/src/output-ports/foo.ts
import type { SomeContract } from "@mcp-browser-kit/types";

export interface FooOutputPort extends SomeContract {}
export const FooOutputPort = Symbol("FooOutputPort");
```

Re-export from the package root (`packages/core-<name>/src/index.ts`).

Use `Symbol(...)` by default. Use `Symbol.for(...)` only when the token must be resolvable across independent realms/bundles.

### 3. Default scope: Singleton

Every core container factory creates the container with:

```ts
const container = new Container({ defaultScope: "Singleton" });
```

Opt into transient explicitly per binding with `.inTransientScope()` when needed.

### 4. Core container factories

Each `core-*` package exports a `createCore<Name>Container()` that:

1. Creates the container
2. Binds **input ports → use cases** (driving side is owned by core)
3. Binds internal core collaborators via `.toSelf()`

It must **not** bind output ports — those are the composition root's responsibility.

### 5. Adapter `setupContainer` convention

Every adapter class exposes a static method that registers itself into a container provided by the caller. This is the project-wide extension point.

```ts
static setupContainer(
  container: Container,
  serviceIdentifier: interfaces.ServiceIdentifier<FooOutputPort> = FooOutputPort,
) {
  container.bind<FooOutputPort>(serviceIdentifier).to(FooDrivenAdapter);
}
```

Callers pass the container they own; they may override the token when a single class implements multiple ports.

## Recipes

### Recipe A — Define a new output port

1. Create `packages/core-<name>/src/output-ports/<port-kebab>.ts`:
   ```ts
   export interface FooOutputPort {
     doFoo(input: string): Promise<void>;
   }
   export const FooOutputPort = Symbol("FooOutputPort");
   ```
2. Re-export from `packages/core-<name>/src/index.ts`.
3. Inject into a use case with `@inject(FooOutputPort)`.

Reference: `packages/core-server/src/output-ports/logger-factory.ts`

### Recipe B — Define a new input port + use case

1. Define the input port (same dual-identifier pattern) in `packages/core-<name>/src/input-ports/`.
2. Implement the use case in `packages/core-<name>/src/core/`:
   ```ts
   import { inject, injectable } from "inversify";

   @injectable()
   export class DoFooUseCase implements FooInputPort {
     constructor(
       @inject(BarOutputPort) private readonly bar: BarOutputPort,
     ) {}

     async execute(input: string) {
       await this.bar.doSomething(input);
     }
   }
   ```
3. Bind the use case to the input-port token inside `createCore<Name>Container()`:
   ```ts
   container.bind<FooInputPort>(FooInputPort).to(DoFooUseCase);
   ```

Reference: `packages/core-server/src/utils/create-core-server-container.ts` and `packages/core-server/src/core/`.

### Recipe C — Implement a driven adapter (secondary)

Package name: `<context>-driven-<capability>` (e.g. `driven-logger-factory`).

```ts
import { Container, inject, injectable, type interfaces } from "inversify";
import { FooOutputPort } from "@mcp-browser-kit/core-<name>";

@injectable()
export class FooDrivenAdapter implements FooOutputPort {
  async doFoo(input: string) { /* external I/O */ }

  static setupContainer(
    container: Container,
    serviceIdentifier: interfaces.ServiceIdentifier<FooOutputPort> = FooOutputPort,
  ) {
    container.bind<FooOutputPort>(serviceIdentifier).to(FooDrivenAdapter);
  }
}
```

Do **not** import from sibling adapter packages. Depend only on the relevant `core-*` package (for the port) and `types`/`helper-*` as needed.

Reference: `packages/driven-logger-factory/src/services/consola.ts` (see `setupContainer` near line 287).

### Recipe D — Implement a driving adapter (primary)

Package name: `<context>-driving-<capability>` (e.g. `server-driving-mcp-server`).

```ts
import { Container, inject, injectable } from "inversify";
import { FooInputPort } from "@mcp-browser-kit/core-<name>";

@injectable()
export class BazDrivingAdapter {
  constructor(
    @inject(FooInputPort) private readonly foo: FooInputPort,
  ) {}

  async start() { /* accept external requests and dispatch to this.foo */ }

  static setupContainer(container: Container) {
    container.bind(BazDrivingAdapter).toSelf();
  }
}
```

Driving adapters consume input-port symbols. They register themselves via `.toSelf()` so the app can `container.get(BazDrivingAdapter)` at the entrypoint.

Reference: `packages/server-driving-mcp-server/src/services/server-driving-mcp-server.ts` (`setupContainer` near line 103).

### Recipe E — Wire an app composition root

Ordering is important: **core factory first, then driven adapters, then driving adapters, then resolve in `main.ts`.**

```ts
// apps/<app>/src/services/container.ts
import { createCoreXxxContainer, FooOutputPort } from "@mcp-browser-kit/core-<name>";
import { FooDrivenAdapter } from "@mcp-browser-kit/<context>-driven-<capability>";
import { BazDrivingAdapter } from "@mcp-browser-kit/<context>-driving-<capability>";

export const container = createCoreXxxContainer();

FooDrivenAdapter.setupContainer(container, FooOutputPort);
BazDrivingAdapter.setupContainer(container);
```

```ts
// apps/<app>/src/main.ts
import "reflect-metadata";
import { container } from "./services/container";
import { BazDrivingAdapter } from "@mcp-browser-kit/<context>-driving-<capability>";

async function main() {
  await container.get(BazDrivingAdapter).start();
}

main();
```

Reference: `apps/server/src/services/container.ts` and `apps/server/src/main.ts`.

### Recipe F — Per-runtime sub-containers (browser extensions)

MV2/MV3 isolate runtimes (background/service worker vs. content script vs. popup). Each runtime is its own process and **cannot share an Inversify container instance**. Create a dedicated composition root per runtime:

- `bootstrap-<ext>-sw.ts` / `bootstrap-<ext>-bg.ts` — the worker/background context
- `bootstrap-<ext>-tab.ts` — the content-script context

Each bootstrap calls `createCore<Name>Container()` and wires the adapters appropriate for that runtime (e.g. browser-side logger in tabs, error-stream logger in server).

Reference: `apps/m3/src/bootstrap-mbk-sw.ts` and `apps/m3/src/bootstrap-mbk-tab.ts`.

## Decision Guide

### Which package prefix?

1. Defines domain behavior or a port? → `core-*`
2. External entrypoint that calls into the core? → `*-driving-*`
3. Implementation the core calls outward to? → `*-driven-*`
4. Shared mixin/util consumed by multiple adapters? → `helper-*`
5. Pure type contract with no runtime? → add to `types`

### Which logger adapter?

- Node/server process where stdout is reserved for protocol traffic → `DrivenLoggerFactoryConsolaError` (writes to stderr)
- Browser/extension runtime → `DrivenLoggerFactoryConsolaBrowser`

### `Symbol` vs `Symbol.for`?

- Default: `Symbol("Name")` — unique per module instance, fine for normal use
- `Symbol.for("Name")` — only when the token must match across independent bundles/realms

## Gotchas

- **Adapter → core, not adapter → types.** If a port exists, import its symbol from the owning `core-*` package.
- **No shared containers across extension runtimes.** SW and each tab get their own.
- **Multi-token aliasing**: binding one class to two tokens with `.to(Class)` twice produces **two singletons**. If you need a single instance resolvable under multiple tokens, bind once, then alias with `.toService(otherToken)` (or bind `.toConstantValue(instance)`).
- **Injecting `Container` itself** is possible (useful for lazy resolution inside routers/factories) but tightly couples the consumer to Inversify. Avoid unless lazy resolution is a hard requirement.
- **`ext-e2e-test-app` and `ext-e2e` intentionally do not use DI.** Don't retrofit them.
- **`types` is runtime-free.** Never add `@injectable` classes or Symbols there.

## Checklists

### New port

- [ ] File under `core-*/src/{input,output}-ports/`
- [ ] `export interface XxxPort` and `export const XxxPort = Symbol("XxxPort")` share a name
- [ ] Re-exported from `core-*/src/index.ts`
- [ ] Consumers use `@inject(XxxPort) private foo: XxxPort`

### New driven adapter

- [ ] Package named `<context>-driven-<capability>`
- [ ] Depends on the owning `core-*` package (not `types`) for the port
- [ ] Class marked `@injectable()`
- [ ] Implements the port interface
- [ ] Provides `static setupContainer(container, serviceIdentifier?)`
- [ ] No imports from sibling adapter packages

### New driving adapter

- [ ] Package named `<context>-driving-<capability>`
- [ ] Constructor injects input-port symbols via `@inject(...)`
- [ ] Provides `static setupContainer(container)` that registers the class with `.toSelf()`
- [ ] Exposes a public entrypoint method (e.g. `start`, `initMcpServer`)

### New app wiring

- [ ] `createCore<Name>Container()` called first
- [ ] All required driven adapters registered via their `setupContainer`
- [ ] All driving adapters registered via their `setupContainer`
- [ ] `main.ts` / bootstrap imports `reflect-metadata` at the top
- [ ] Entry resolves via `container.get(DrivingAdapter)` and invokes its entrypoint

## Reference File Index

Real examples in this repo. Open these when implementing a recipe — they are the source of truth.

### Port definitions
- `packages/core-server/src/output-ports/logger-factory.ts` — minimal output port
- `packages/core-server/src/output-ports/extension-channel-provider.ts`
- `packages/core-server/src/input-ports/server-tool-calls.ts`
- `packages/core-extension/src/output-ports/browser-driver.ts`
- `packages/core-extension/src/output-ports/server-channel-provider.ts`
- `packages/core-extension/src/input-ports/` — additional input ports

### Core container factories
- `packages/core-server/src/utils/create-core-server-container.ts`
- `packages/core-extension/src/utils/create-core-extension-container.ts`

### Use cases
- `packages/core-server/src/core/server-tool-calls.ts` — `@injectable` use case with `@inject`

### Driven adapter examples
- `packages/driven-logger-factory/src/services/consola.ts` — `setupContainer` at ~line 287
- `packages/server-driven-trpc-channel-provider/src/services/server-driven-trpc-channel-provider.ts` — `setupContainer` at ~line 248 (also demonstrates transient scope and Container-as-dependency)
- `packages/extension-driven-browser-driver/`
- `packages/extension-driven-server-channel-provider/`

### Driving adapter examples
- `packages/server-driving-mcp-server/src/services/server-driving-mcp-server.ts` — `setupContainer` at ~line 103
- `packages/extension-driving-trpc-controller/`

### App composition roots
- `apps/server/src/services/container.ts` + `apps/server/src/main.ts` — server
- `apps/m3/src/bootstrap-mbk-sw.ts` + `apps/m3/src/bootstrap-mbk-tab.ts` — MV3 extension
- `apps/m2/src/bootstrap-mbk-bg.ts` + `apps/m2/src/bootstrap-mbk-tab.ts` — MV2 extension

### Helpers / shared
- `packages/helper-base-extension-channel-provider/`
- `packages/helper-extension-keep-alive/`
- `packages/core-utils/` — shared library code (not a hexagon; no ports)
- `packages/types/` — pure type contracts, no DI
