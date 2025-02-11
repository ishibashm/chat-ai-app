import { NextRequest, NextResponse } from 'next/server';
import { McpConfigManager, DEFAULT_CONFIG_PATH } from '@/lib/mcpConfig';
import { UpdateServerConfigRequest, DeleteServerConfigRequest } from '@/types/mcpConfig';

const configManager = new McpConfigManager(DEFAULT_CONFIG_PATH);

/**
 * 設定の取得
 */
export async function GET() {
  try {
    await configManager.loadConfig();
    const configs = configManager.getAllServerConfigs();
    
    return NextResponse.json(
      { configs },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('設定の取得に失敗しました:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 設定の更新
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as UpdateServerConfigRequest;
    const { serverName, config } = body;

    if (!serverName || !config) {
      return NextResponse.json(
        { error: 'serverName と config は必須です' },
        { status: 400 }
      );
    }

    await configManager.loadConfig();
    await configManager.updateServerConfig(serverName, config);

    // 設定のバリデーション
    const validationErrors = configManager.validateConfig();
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: '無効な設定です', validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: '設定を更新しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('設定の更新に失敗しました:', error);
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 設定の削除
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as DeleteServerConfigRequest;
    const { serverName } = body;

    if (!serverName) {
      return NextResponse.json(
        { error: 'serverName は必須です' },
        { status: 400 }
      );
    }

    await configManager.loadConfig();
    await configManager.deleteServerConfig(serverName);

    return NextResponse.json(
      { message: '設定を削除しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('設定の削除に失敗しました:', error);
    return NextResponse.json(
      { error: '設定の削除に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONSリクエストのハンドリング
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}