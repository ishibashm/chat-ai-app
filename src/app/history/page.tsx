'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ChatSearch from '@/components/search/ChatSearch';
import { useChatContext } from '@/lib/chatContext';
import { formatDate } from '@/lib/chatSearch';
import { downloadChats, readChatFile } from '@/lib/chatExportImport';

type TabType = 'search' | 'history';

export default function HistoryPage() {
  const { chats, setCurrentChatId, exportChats, importChats, settings } = useChatContext();
  const [activeTab, setActiveTab] = useState<TabType>('search');

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    window.location.href = '/';
  };

  const handleExport = async () => {
    try {
      const exportData = await exportChats();
      await downloadChats(exportData);
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
        await importChats(importData);
        alert(`${result.importedChatsCount}件のチャットをインポートしました`);
      } else {
        alert(`インポートに失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('インポートに失敗しました:', error);
      alert('インポートに失敗しました');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* ヘッダー */}
      <div className="sticky top-0 flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-white">チャット履歴</h1>
          <div className="text-sm text-gray-400">
            全{chats.length}件
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            インポート
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            AIチャットに戻る
          </Link>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-800 bg-gray-900 sticky top-12 z-10">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          検索
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1">
        {activeTab === 'search' ? (
          <ChatSearch />
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-white">{chat.title}</h3>
                    <div className="text-sm text-gray-400">
                      {formatDate(new Date(chat.createdAt))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    モデル: {chat.model}
                  </div>
                  {chat.messages.length > 0 && (
                    <div className="mt-2 text-sm bg-gray-700 text-white p-2 rounded border-l-4 border-blue-500">
                      {chat.messages[0].content.slice(0, 100)}
                      {chat.messages[0].content.length > 100 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}