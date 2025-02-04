import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModelType } from '../../types/chat';
import { SearchFilters, SearchResult, searchChats, formatDate } from '../../lib/chatSearch';
import { useChatContext } from '../../lib/chatContext';

export default function ChatSearch() {
  const router = useRouter();
  const { chats, setCurrentChatId } = useChatContext();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 検索を実行
  const handleSearch = useCallback(async () => {
    try {
      const results = await searchChats(chats, filters);
      setSearchResults(results);
    } catch (error) {
      console.error('検索エラー:', error);
      // エラー処理を追加
    }
  }, [chats, filters]);

  // フィルターの変更時に自動で検索を実行
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  // コンポーネントのマウント時に初期検索を実行
  useEffect(() => {
    handleSearch();
  }, []);

  // キーワード検索
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, keyword: e.target.value }));
  };

  // モデルフィルター
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value as ModelType;
    setFilters((prev) => ({ ...prev, model: model || undefined }));
  };

  // 日付フィルター
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      startDate: e.target.value ? new Date(e.target.value) : undefined,
    }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      endDate: e.target.value ? new Date(e.target.value) : undefined,
    }));
  };

  // チャットの選択
  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    router.push('/'); // メインページに戻る
  };

  return (
    <div className="h-full flex flex-col">
      {/* 検索フィルター */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* キーワード検索 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="チャットを検索..."
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              value={filters.keyword || ''}
              onChange={handleKeywordChange}
            />
          </div>

          {/* モデルフィルター */}
          <div className="w-48">
            <select
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.model || ''}
              onChange={handleModelChange}
            >
              <option value="">全てのモデル</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-0125-preview">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5</option>
              <option value="claude">Claude</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
          </div>

          {/* 日付フィルター */}
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="開始日"
              className="w-40 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.startDate?.toISOString().split('T')[0] || ''}
              onChange={handleStartDateChange}
            />
            <input
              type="date"
              placeholder="終了日"
              className="w-40 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.endDate?.toISOString().split('T')[0] || ''}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
      </div>

      {/* 検索結果 */}
      <div className="flex-1 p-4">
        <div className="text-sm text-gray-400 mb-4">
          {searchResults.length}件の結果
        </div>
        
        <div className="grid grid-cols-2 gap-4 auto-rows-max">
          {searchResults.map((result) => (
            <div
              key={result.chat.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => handleChatSelect(result.chat.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-white">{result.chat.title}</h3>
                <div className="text-sm text-gray-400">
                  {formatDate(new Date(result.chat.createdAt))}
                </div>
              </div>
              
              <div className="text-sm text-gray-400 mb-3">
                モデル: {result.chat.model}
              </div>
              
              {result.matches.map((match, index) => (
                <div key={index} className="space-y-2">
                  {match.highlight.map((highlight, i) => (
                    <div
                      key={i}
                      className="text-sm bg-gray-700 text-white p-2 rounded border-l-4 border-blue-500"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {searchResults.length === 0 && filters.keyword && (
          <div className="text-center text-gray-400 py-8">
            検索結果が見つかりませんでした
          </div>
        )}
      </div>
    </div>
  );
}