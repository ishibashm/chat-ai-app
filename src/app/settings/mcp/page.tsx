'use client';

import { useState, useEffect } from 'react';
import { McpServerConfig } from '@/types/mcpConfig';
import { useRouter } from 'next/navigation';

interface FormErrors {
  [key: string]: string[];
}

const CONFIG_EXAMPLES = {
  'brave-search': {
    name: 'Brave Search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      'BRAVE_API_KEY': 'あなたのAPIキー'
    }
  },
  'local-search': {
    name: 'ローカル検索',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-local-search'],
    env: {}
  }
};

export default function McpSettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<Record<string, McpServerConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showHelp, setShowHelp] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{[key: string]: 'saving' | 'saved' | 'error' | null}>({});

  // 設定の読み込み
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mcp/config');
      if (!response.ok) {
        throw new Error(`設定の読み込みに失敗しました: ${response.status}`);
      }
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
      setSaveStatus(prev => ({ ...prev, [serverName]: 'saving' }));
      const response = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName, config }),
      });

      if (!response.ok) {
        const data = await response.json();
        setFormErrors({ [serverName]: data.validationErrors || [data.error] });
        setSaveStatus(prev => ({ ...prev, [serverName]: 'error' }));
        return;
      }

      setFormErrors({});
      setSaveStatus(prev => ({ ...prev, [serverName]: 'saved' }));
      await loadConfigs();

      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [serverName]: null }));
      }, 3000);
    } catch (error) {
      setError('設定の更新に失敗しました');
      setSaveStatus(prev => ({ ...prev, [serverName]: 'error' }));
      console.error(error);
    }
  };

  const deleteConfig = async (serverName: string) => {
    if (!confirm(`${serverName}の設定を削除してもよろしいですか?`)) {
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
    const serverName = prompt('サーバー名を入力してください(例: brave-search)');
    if (!serverName) return;

    if (configs[serverName]) {
      alert('この名前のサーバーは既に存在します');
      return;
    }

    const newConfig: McpServerConfig = {
      command: '',
      args: [],
      env: {},
      disabled: false,
      alwaysAllow: [],
    };

    setConfigs(prev => ({ ...prev, [serverName]: newConfig }));
  };

  const applyExample = (serverName: string, example: typeof CONFIG_EXAMPLES[keyof typeof CONFIG_EXAMPLES]) => {
    setConfigs(prev => ({
      ...prev,
      [serverName]: {
        ...prev[serverName],
        command: example.command,
        args: [...example.args],
        env: { ...example.env },
      }
    }));
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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <h1 className="text-2xl font-bold">MCPサーバー設定</h1>
          </div>
          <button
            onClick={addNewConfig}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しいサーバーを追加
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-blue-800">設定例とヘルプ</h2>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1"
            >
              {showHelp ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  非表示
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  表示
                </>
              )}
            </button>
          </div>
          {showHelp && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-700">
                  <strong>ヒント:</strong> 設定を簡単に始めるには、「設定例を適用」ボタンを使用してください。
                  その後、必要に応じて環境変数(APIキーなど)を設定してください。
                </p>
              </div>
              <p className="text-sm text-blue-700">
                MCPサーバーの設定方法:
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                <li>「新しいサーバーを追加」をクリックしてサーバー名を入力</li>
                <li>コマンドと引数を設定(例: npx -y @modelcontextprotocol/server-brave-search)</li>
                <li>必要な環境変数を設定(例: APIキー)</li>
                <li>「設定例を適用」ボタンで既存の設定例を利用可能</li>
              </ol>
              <div className="mt-4">
                <h3 className="font-medium text-blue-800 mb-2">利用可能な設定例:</h3>
                {Object.entries(CONFIG_EXAMPLES).map(([key, example]) => (
                  <div key={key} className="bg-white p-4 rounded border border-blue-100 mb-2">
                    <h4 className="font-medium text-blue-800 mb-2">{example.name}</h4>
                    <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(example, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
              <div className="flex gap-2">
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      const example = Object.entries(CONFIG_EXAMPLES).find(
                        ([key]) => serverName.includes(key)
                      )?.[1];
                      if (example) {
                        if (confirm('設定例を適用しますか?\n\n注意:現在の設定は上書きされます。')) {
                          applyExample(serverName, example);
                        }
                      } else {
                        alert('このサーバー名に対応する設定例が見つかりません。');
                      }
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    設定例を適用
                  </button>
                </div>
                <button
                  onClick={() => deleteConfig(serverName)}
                  className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  削除
                </button>
              </div>
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
                  <span className="text-gray-500 text-xs ml-2">(例: npx)</span>
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
                  引数(カンマ区切り)
                  <span className="text-gray-500 text-xs ml-2">(例: -y,@modelcontextprotocol/server-brave-search)</span>
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
                  <span className="text-gray-500 text-xs ml-2">(例: BRAVE_API_KEY)</span>
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
                        placeholder="キー(例: BRAVE_API_KEY)"
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
                        placeholder="値(例: your-api-key)"
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
                  許可するツール(カンマ区切り)
                  <span className="text-gray-500 text-xs ml-2">(例: tool1,tool2)</span>
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
                  placeholder="例: tool1,tool2"
                />
              </div>

              <div className="flex justify-end">
                {saveStatus[serverName] === 'saving' && (
                  <div className="animate-pulse flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-8 bg-gray-200 rounded"></div>
                  </div>
                )}
                {saveStatus[serverName] === 'saved' && (
                  <div className="text-green-500">保存しました</div>
                )}
                {saveStatus[serverName] === 'error' && (
                  <div className="text-red-500">保存に失敗しました</div>
                )}
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