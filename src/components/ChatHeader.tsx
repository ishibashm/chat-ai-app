'use client';

import React from 'react';
import Link from 'next/link';
import { Chat, ChatExportData, ModelType } from '@/types/chat';
import { downloadChats, readChatFile } from '@/lib/chatExportImport';
import { useChatContext } from '../lib/chatContext';

export default function ChatHeader() {
  const { chats, settings, exportChats, importChats } = useChatContext();

  const handleExport = async () => {
    try {
      const exportData = await exportChats();

      const response = await fetch('/api/chat/export-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'export', data: exportData }),
      });

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      const result = await response.json();

      if (result.success) {
        await downloadChats(result.data);
      } else {
        alert(`エクスポートに失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('エクスポートに失敗しました:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const handleImport = async () => {
    try {
      const result = await readChatFile();
      if (result.success) {
        const importData = {
          version: '1.0.0',
          exportedAt: Date.now(),
          chats: [],
          settings: settings,
        };

        const response = await fetch('/api/chat/export-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'import', data: importData }),
        });

        if (!response.ok) {
          throw new Error('インポートに失敗しました');
        }

        const importResult = await response.json();

        if (importResult.success) {
          alert(`${importResult.importedChatsCount}件のチャットをインポートしました`);
        } else {
          alert(`インポートに失敗しました: ${importResult.error}`);
        }
      } else {
        alert(`インポートに失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('インポートに失敗しました:', error);
      alert('インポートに失敗しました');
    }
  };

  const modelCounts: Record<ModelType, number> = chats.reduce((acc: Record<ModelType, number>, chat: Chat) => {
    acc[chat.model] = (acc[chat.model] || 0) + 1;
    return acc;
  }, {} as Record<ModelType, number>);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center space-x-2 sm:space-x-4 mb-2 sm:mb-0 pl-12 lg:pl-0">
        <h1 className="text-lg sm:text-xl font-semibold text-white">AIチャット</h1>
        <div className="text-xs sm:text-sm text-gray-400">
          全{chats.length}件
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <div className="hidden sm:flex space-x-4">
          {Object.entries(modelCounts).map(([model, count]) => (
            <div key={model} className="text-xs sm:text-sm text-gray-400">
              {model}: {count}件
            </div>
          ))}
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Link 
            href="/history" 
            className="flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            履歴
          </Link>
          <Link 
            href="/settings/mcp" 
            className="flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            MCP設定
          </Link>
          <Link 
            href="/api/export-import" 
            className="flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            エクスポート
          </Link>
        </div>
      </div>
    </div>
  );
}