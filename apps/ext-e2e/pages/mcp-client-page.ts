import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ServerToolName,
  ServerToolArgs,
  ServerToolResult,
} from '@mcp-browser-kit/core-server';

export class McpClientPage {
  private client: Client;
  private clientTransport: ReturnType<typeof InMemoryTransport.createLinkedPair>[0] | null = null;
  private serverTransport: ReturnType<typeof InMemoryTransport.createLinkedPair>[1] | null = null;

  constructor() {
    this.client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
  }

  async connect(mcpServer: McpServer) {
    [this.clientTransport, this.serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(this.serverTransport),
      this.client.connect(this.clientTransport),
    ]);
  }

  async disconnect() {
    await this.client.close();
  }

  async listTools() {
    const res = await this.client.request(
      { method: 'tools/list', params: {} },
      ListToolsResultSchema,
    );
    return res.tools;
  }

  async callTool<T extends ServerToolName>(
    name: T,
    ...args: keyof ServerToolArgs<T> extends never ? [] : [args: ServerToolArgs<T>]
  ): Promise<ServerToolResult<T>> {
    const res = await this.client.request(
      {
        method: 'tools/call',
        params: { name, arguments: args[0] ?? {} },
      },
      CallToolResultSchema,
    );
    return res.content as ServerToolResult<T>;
  }

  async listResources() {
    const res = await this.client.request(
      { method: 'resources/list', params: {} },
      ListResourcesResultSchema,
    );
    return res.resources;
  }
}
