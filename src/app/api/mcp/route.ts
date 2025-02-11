import { NextRequest, NextResponse } from 'next/server';
import McpHost from '@/lib/mcpHost';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk';

// シングルトンインスタンスとしてMcpHostを作成
const mcpHost = new McpHost('http://localhost:3001/api/mcp', {
  retryAttempts: 3,
  retryDelay: 1000,
});

// リクエストボディの型定義
interface McpRequestBody {
  toolName: string;
  query: string;
}

// レスポンスの型定義
interface McpSuccessResponse {
  result: string;
}

interface McpErrorResponse {
  error: string;
  code: ErrorCode;
}

/**
 * POSTリクエストハンドラー
 * MCPサーバーへのリクエストを処理し、結果を返します
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as McpRequestBody;
    const { toolName, query } = body;

    if (!toolName || !query) {
      return NextResponse.json<McpErrorResponse>(
        {
          error: 'toolName と query パラメータが必要です',
          code: ErrorCode.InvalidParams
        },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // MCPサーバーに直接リクエストを転送
    const result = await mcpHost.forwardRequestToMcpServer(toolName, query);

    return NextResponse.json<McpSuccessResponse>(
      { result },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: unknown) {
    console.error('MCPリクエストエラー:', error);

    // エラーの種類に応じて適切なレスポンスを返す
    if (error instanceof McpError) {
      return NextResponse.json<McpErrorResponse>(
        {
          error: error.message,
          code: error.code
        },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 不明なエラーの場合
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json<McpErrorResponse>(
      {
        error: errorMessage,
        code: ErrorCode.InternalError
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * GETリクエストハンドラー
 * このエンドポイントではPOSTメソッドのみ許可
 */
export async function GET() {
  return NextResponse.json<McpErrorResponse>(
    {
      error: 'このエンドポイントではPOSTメソッドのみ許可されています',
      code: ErrorCode.InvalidRequest
    },
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST',
      },
    }
  );
}

/**
 * OPTIONSリクエストハンドラー
 * CORS対応の設定を提供
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json',
    },
  });
}