import { 
  Server, 
  StdioServerTransport, 
  CallToolRequestSchema, 
  ErrorCode, 
  ListToolsRequestSchema, 
  McpError, 
  CallToolRequest, 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema,
  ReadResourceRequest
} from '@modelcontextprotocol/sdk';
import { Request, Response } from 'express';
import axios, { AxiosError, isAxiosError } from 'axios';

interface McpHostConfig {
  retryAttempts?: number;
  retryDelay?: number;
}

interface McpToolResponse {
  result: string;
}

class McpHost {
  private server: Server;
  private mcpServerEndpoint: string;
  private config: Required<McpHostConfig>;

  constructor(mcpServerEndpoint: string, config: McpHostConfig = {}) {
    this.server = new Server(
      {
        name: 'mcp-host',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {
            search_results: {
              description: '検索結果リソース',
            },
          },
          tools: {},
        },
      }
    );

    this.mcpServerEndpoint = mcpServerEndpoint;
    this.config = {
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupErrorHandler();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'brave_web_search',
          description: 'Brave Web検索を実行する',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '検索クエリ',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'brave_local_search',
          description: 'Braveローカル検索を実行する',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '検索クエリ',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      if (name === 'brave_web_search' || name === 'brave_local_search') {
        if (!this.isValidToolArgs(args)) {
          throw new McpError(ErrorCode.InvalidParams, 'query パラメータが必要です');
        }

        const result = await this.forwardRequestToMcpServer(name, args.query);

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      throw new McpError(ErrorCode.MethodNotFound, `ツール ${name} は見つかりません`);
    });
  }

  private isValidToolArgs(args: unknown): args is { query: string } {
    return typeof args === 'object' && 
           args !== null && 
           'query' in args && 
           typeof (args as { query: unknown }).query === 'string';
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'search://results',
          name: '検索結果',
          description: '最新の検索結果',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
      const { uri } = request.params;
      if (!uri.startsWith('search://')) {
        throw new McpError(ErrorCode.InvalidRequest, '無効なリソースURIです');
      }

      try {
        const response = await axios.get<McpToolResponse>(
          `${this.mcpServerEndpoint}/resources${uri}`
        );

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        if (isAxiosError(error)) {
          throw new McpError(
            ErrorCode.ResourceNotFound, 
            `リソースの取得に失敗しました: ${error.message}`
          );
        }
        throw new McpError(ErrorCode.InternalError, 'リソースの取得に失敗しました');
      }
    });
  }

  private setupErrorHandler(): void {
    this.server.onerror = (error: Error) => {
      console.error('[MCPホストエラー]', error);
    };
  }

  public async forwardRequestToMcpServer(toolName: string, query: string): Promise<string> {
    let lastError: Error = new Error('リクエストの実行に失敗しました');

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios.post<McpToolResponse>(this.mcpServerEndpoint, {
          toolName,
          query,
        });

        return response.data.result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('不明なエラーが発生しました');
        
        if (isAxiosError(error)) {
          if (error.response?.status && error.response.status >= 500) {
            if (attempt < this.config.retryAttempts) {
              await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
              continue;
            }
          }
          if (error.response?.status && error.response.status < 500) {
            throw new McpError(
              ErrorCode.InvalidRequest, 
              `クライアントエラー: ${error.message}`
            );
          }
        }
      }
    }

    throw new McpError(
      ErrorCode.InternalError,
      `MCPサーバーへのリクエストが失敗しました: ${lastError.message}`
    );
  }

  async connectStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('MCPホストがstdio経由で実行されています');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('stdio接続エラー:', errorMessage);
      throw error;
    }
  }

  async handleHttpRequest(req: Request, res: Response): Promise<Response> {
    try {
      const { toolName, query } = req.body;

      if (!toolName || !query) {
        return res.status(400).json({ 
          error: 'toolName と query パラメータが必要です',
          code: ErrorCode.InvalidParams 
        });
      }

      const result = await this.forwardRequestToMcpServer(toolName, query);
      return res.status(200).json({ result });
    } catch (error: unknown) {
      if (error instanceof McpError) {
        return res.status(400).json({ 
          error: error.message, 
          code: error.code 
        });
      }
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('HTTPリクエストエラー:', errorMessage);
      return res.status(500).json({ 
        error: '内部サーバーエラー',
        code: ErrorCode.InternalError 
      });
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.server.close();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('シャットダウンエラー:', errorMessage);
      throw error;
    }
  }
}

// エントリーポイント
if (!process.stdin.isTTY) {
  const mcpHost = new McpHost('http://localhost:3001/api/mcp', {
    retryAttempts: 3,
    retryDelay: 1000,
  });
  
  mcpHost.connectStdio().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('MCPホストの起動に失敗しました:', errorMessage);
    process.exit(1);
  });

  // シャットダウンハンドラー
  process.on('SIGINT', async () => {
    try {
      await mcpHost.shutdown();
      process.exit(0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('シャットダウンに失敗しました:', errorMessage);
      process.exit(1);
    }
  });
}

export default McpHost;