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
    <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-white">AIチャット</h1>
        <div className="text-sm text-gray-400">
          全{chats.length}件
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex space-x-4">
          {Object.entries(modelCounts).map(([model, count]) => (
            <div key={model} className="text-sm text-gray-400">
              {model}: {count}件
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <Link href="/history" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            チャット履歴
          </Link>
          <Link href="/api/export-import" className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            エクスポート/インポート
          </Link>
        </div>
      </div>
    </div>
  );
}