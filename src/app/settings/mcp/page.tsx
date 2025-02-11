'use client';

import { useState, useEffect } from 'react';
import { McpServerConfig } from '@/types/mcpConfig';

interface FormErrors {
  [key: string]: string[];
}

export default function McpSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, McpServerConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // 設定の読み込み
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mcp/config');
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      setError('設定の読み込みに失敗しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (serverName: string, config: McpServerConfig) => {
    try {
      const response = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName, config }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormErrors({ [serverName]: data.validationErrors || [data.error] });
        return;
      }

      setFormErrors({});
      await loadConfigs();
    } catch (error) {
      setError('設定の更新に失敗しました');
      console.error(error);
    }
  };

  const deleteConfig = async (serverName: string) => {
    if (!confirm(`${serverName}の設定を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/mcp/config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName }),
      });

      if (!response.ok) {
        setError('設定の削除に失敗しました');
        return;
      }

      await loadConfigs();
    } catch (error) {
      setError('設定の削除に失敗しました');
      console.error(error);
    }
  };

  const addNewConfig = () => {
    const serverName = prompt('サーバー名を入力してください');
    if (!serverName) return;

    const newConfig: McpServerConfig = {
      command: '',
      args: [],
      env: {},
      disabled: false,
      alwaysAllow: [],
    };

    setConfigs(prev => ({ ...prev, [serverName]: newConfig }));
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">MCPサーバー設定</h1>
        <button
          onClick={addNewConfig}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          新しいサーバーを追加
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(configs).map(([serverName, config]) => (
          <div key={serverName} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{serverName}</h2>
              <button
                onClick={() => deleteConfig(serverName)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                削除
              </button>
            </div>

            {formErrors[serverName]?.map((error, index) => (
              <div key={index} className="text-red-500 text-sm mb-2">
                {error}
              </div>
            ))}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateConfig(serverName, config);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  コマンド
                </label>
                <input
                  type="text"
                  value={config.command}
                  onChange={(e) => {
                    setConfigs(prev => ({
                      ...prev,
                      [serverName]: { ...config, command: e.target.value }
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: npx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  引数（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={config.args.join(',')}
                  onChange={(e) => {
                    setConfigs(prev => ({
                      ...prev,
                      [serverName]: { ...config, args: e.target.value.split(',').filter(Boolean) }
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: -y,@modelcontextprotocol/server-brave-search"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  環境変数
                </label>
                <div className="space-y-2">
                  {Object.entries(config.env).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newEnv = { ...config.env };
                          const oldValue = newEnv[key];
                          delete newEnv[key];
                          newEnv[e.target.value] = oldValue;
                          setConfigs(prev => ({
                            ...prev,
                            [serverName]: { ...config, env: newEnv }
                          }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="キー"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          setConfigs(prev => ({
                            ...prev,
                            [serverName]: {
                              ...config,
                              env: { ...config.env, [key]: e.target.value }
                            }
                          }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="値"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newEnv = { ...config.env };
                          delete newEnv[key];
                          setConfigs(prev => ({
                            ...prev,
                            [serverName]: { ...config, env: newEnv }
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setConfigs(prev => ({
                        ...prev,
                        [serverName]: {
                          ...config,
                          env: { ...config.env, 'NEW_KEY': '' }
                        }
                      }));
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    + 環境変数を追加
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.disabled}
                    onChange={(e) => {
                      setConfigs(prev => ({
                        ...prev,
                        [serverName]: { ...config, disabled: e.target.checked }
                      }));
                    }}
                    className="mr-2 rounded border-gray-300 focus:ring-blue-500"
                  />
                  無効化
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  許可するツール（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={config.alwaysAllow?.join(',') || ''}
                  onChange={(e) => {
                    setConfigs(prev => ({
                      ...prev,
                      [serverName]: {
                        ...config,
                        alwaysAllow: e.target.value.split(',').filter(Boolean)
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: tool1,tool2,tool3"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}