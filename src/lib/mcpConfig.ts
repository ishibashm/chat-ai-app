import fs from 'fs/promises';
import path from 'path';
import { McpConfig, McpServerConfig } from '@/types/mcpConfig';

export class McpConfigManager {
  private configPath: string;
  private config: McpConfig;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = { mcpServers: {} };
  }

  /**
   * 設定ファイルを読み込む
   */
  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // 設定ファイルが存在しない場合は空の設定を作成
        await this.saveConfig();
      } else {
        throw new Error(`設定ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }
  }

  /**
   * 設定ファイルを保存する
   */
  async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`設定ファイルの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * サーバー設定を取得する
   */
  getServerConfig(serverName: string): McpServerConfig | undefined {
    return this.config.mcpServers[serverName];
  }

  /**
   * 全てのサーバー設定を取得する
   */
  getAllServerConfigs(): Record<string, McpServerConfig> {
    return this.config.mcpServers;
  }

  /**
   * サーバー設定を更新または追加する
   */
  async updateServerConfig(serverName: string, config: McpServerConfig): Promise<void> {
    // 基本的な設定の検証
    if (!config.command || !Array.isArray(config.args) || typeof config.env !== 'object') {
      throw new Error('無効なサーバー設定です');
    }

    // デフォルト値の設定
    const updatedConfig: McpServerConfig = {
      ...config,
      disabled: config.disabled ?? false,
      alwaysAllow: config.alwaysAllow ?? [],
    };

    this.config.mcpServers[serverName] = updatedConfig;
    await this.saveConfig();
  }

  /**
   * サーバー設定を削除する
   */
  async deleteServerConfig(serverName: string): Promise<void> {
    if (!(serverName in this.config.mcpServers)) {
      throw new Error(`サーバー "${serverName}" が見つかりません`);
    }

    delete this.config.mcpServers[serverName];
    await this.saveConfig();
  }

  /**
   * 設定のバリデーションを行う
   */
  validateConfig(): string[] {
    const errors: string[] = [];

    Object.entries(this.config.mcpServers).forEach(([serverName, config]) => {
      if (!config.command) {
        errors.push(`${serverName}: commandが必要です`);
      }
      if (!Array.isArray(config.args)) {
        errors.push(`${serverName}: argsは配列である必要があります`);
      }
      if (typeof config.env !== 'object') {
        errors.push(`${serverName}: envはオブジェクトである必要があります`);
      }
    });

    return errors;
  }
}

// 設定ファイルのデフォルトパス
export const DEFAULT_CONFIG_PATH = process.env.MCP_CONFIG_PATH ||
  path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');