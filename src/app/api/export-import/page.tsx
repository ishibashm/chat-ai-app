'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useChatContext } from '@/lib/chatContext';
import { ChatExportData } from '@/types/chat';

export default function ExportImportPage() {
  const { exportChats, importChats, settings } = useChatContext();
  const [exportData, setExportData] = useState<ChatExportData | null>(null);
  const [importData, setImportData] = useState<ChatExportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const data = await exportChats();
      setExportData(data);
      setError(null);
    } catch (error) {
      setError('エクスポートに失敗しました');
    }
  };

  const handleImport = async (data: ChatExportData) => {
    try {
      await importChats(data);
      setImportData(data);
      setError(null);
    } catch (error) {
      setError('インポートに失敗しました');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-white">エクスポート/インポート</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          戻る
        </Link>
      </div>
      <div className="flex-1 p-4">
        <button onClick={handleExport} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          エクスポート
        </button>
        {exportData && (
          <pre className="mt-4 bg-gray-800 text-white p-4 rounded">{JSON.stringify(exportData, null, 2)}</pre>
        )}
        <div className="mt-4">
          <input
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                  try {
                    const data = JSON.parse(e.target?.result as string) as ChatExportData;
                    await handleImport(data);
                  } catch (error) {
                    setError('無効なファイルです');
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
        </div>
        {importData && (
          <pre className="mt-4 bg-gray-800 text-white p-4 rounded">{JSON.stringify(importData, null, 2)}</pre>
        )}
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </div>
    </div>
  );
}