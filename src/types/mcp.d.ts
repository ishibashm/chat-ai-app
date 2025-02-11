declare module '@modelcontextprotocol/sdk' {
  export interface ServerConfig {
    name: string;
    version: string;
  }

  export interface ServerCapabilities {
    capabilities: {
      resources: Record<string, { description: string }>;
      tools: Record<string, unknown>;
    };
  }

  export class Server {
    constructor(config: ServerConfig, capabilities: ServerCapabilities);
    connect(transport: StdioServerTransport): Promise<void>;
    close(): Promise<void>;
    setRequestHandler<T>(schema: unknown, handler: (request: T) => Promise<any>): void;
    onerror: (error: Error) => void;
  }

  export class StdioServerTransport {
    constructor();
  }

  export const CallToolRequestSchema: unique symbol;
  export const ListToolsRequestSchema: unique symbol;
  export const ListResourcesRequestSchema: unique symbol;
  export const ReadResourceRequestSchema: unique symbol;

  export interface CallToolRequest {
    params: {
      name: string;
      arguments: unknown;
    };
  }

  export interface ReadResourceRequest {
    params: {
      uri: string;
    };
  }

  export enum ErrorCode {
    InvalidRequest = 'InvalidRequest',
    InvalidParams = 'InvalidParams',
    MethodNotFound = 'MethodNotFound',
    InternalError = 'InternalError',
    ResourceNotFound = 'ResourceNotFound'
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }
}