'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatTitle } from './ChatTitle';
import { Chat, ChatState, Message, ModelType, ChatSettings, DEFAULT_SETTINGS, ChatImportResult } from '../types/chat';
import { generateChatResponse } from '../lib/openai';
import {
  createNewChat,
  saveChatsToLocalStorage,
  loadChatsFromLocalStorage,
  generateChatTitle,
  updateChatTitle,
  formatDate,
  deleteChat,
  getChildChats,
  exportChats,
  downloadChatsAsJson,
  importChats,
} from '../lib/chatStorage';
import {
  getRelatedContext,
  buildMessagesWithContext,
  createChildChat,
  detectRelatedChats,
} from '../lib/chatContext';

export const ChatContainer: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    chats: [],
    currentChatId: null,
    isLoading: false,
  });
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [importError, setImportError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadedChats = loadChatsFromLocalStorage();
    if (loadedChats.length === 0) {
      const newChat = createNewChat();
      setChatState(prev => ({
        ...prev,
        chats: [newChat],
        currentChatId: newChat.id,
      }));
    } else {
      setChatState(prev => ({
        ...prev,
        chats: loadedChats,
        currentChatId: loadedChats[0].id,
      }));
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (chatState.chats.length > 0) {
      saveChatsToLocalStorage(chatState.chats);
    }
    scrollToBottom();
  }, [chatState.chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentChat = (): Chat | undefined => {
    return chatState.chats.find(chat => chat.id === chatState.currentChatId);
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentChat = getCurrentChat();
    const newChat = createNewChat({
      ...(currentChat ? createChildChat(currentChat) : {}),
    });

    setChatState(prev => ({
      ...prev,
      chats: [...prev.chats, newChat],
      currentChatId: newChat.id,
      isLoading: false,
    }));
    setStreamingContent('');
    setError(null);
  };

  const handleSwitchChat = (chatId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setChatState(prev => ({
      ...prev,
      currentChatId: chatId,
      isLoading: false,
    }));
    setStreamingContent('');
    setError(null);
  };

  const handleUpdateTitle = async (chatId: string, newTitle: string) => {
    setChatState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === chatId ? updateChatTitle(chat, newTitle) : chat
      ),
    }));
  };

  const handleDeleteChat = (chatId: string, deleteChildren: boolean) => {
    const updatedChats = deleteChat(chatId, chatState.chats, { deleteChildren });
    const currentChat = getCurrentChat();
    
    setChatState(prev => ({
      ...prev,
      chats: updatedChats,
      currentChatId: currentChat?.id === chatId
        ? updatedChats[0]?.id || null
        : prev.currentChatId,
    }));
  };

  const handleModelChange = (model: ModelType) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    setChatState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === currentChat.id ? { ...chat, model } : chat
      ),
    }));
  };

  const handleSendMessage = async (content: string) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const updatedChat: Chat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      updatedAt: Date.now(),
    };

    // チャットタイトルの自動生成(最初のメッセージの場合)
    if (currentChat.messages.length === 0) {
      const title = await generateChatTitle(content);
      updatedChat.title = title;
    }

    // 関連するチャットの文脈を取得
    const contexts = settings.useContext
      ? getRelatedContext(updatedChat, chatState.chats, settings.maxContextMessages)
      : [];

    // 文脈を含めたメッセージを構築
    const messagesWithContext = buildMessagesWithContext(updatedChat.messages, contexts);

    setChatState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === currentChat.id ? updatedChat : chat
      ),
      isLoading: true,
    }));
    setStreamingContent('');
    setError(null);

    try {
      let fullResponse = '';
      await generateChatResponse(
        messagesWithContext,
        updatedChat.model,
        (chunk) => {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
          scrollToBottom();
        },
        (error) => {
          setError(error.message);
          console.error('Streaming error:', error);
        }
      );

      if (!abortControllerRef.current?.signal.aborted) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        };

        const finalChat: Chat = {
          ...updatedChat,
          messages: [...updatedChat.messages, assistantMessage],
          updatedAt: Date.now(),
        };

        // 関連するチャットを検出して更新
        const relatedChatIds = detectRelatedChats(finalChat, chatState.chats);
        finalChat.contextIds = [...new Set([...(finalChat.contextIds || []), ...relatedChatIds])];

        setChatState(prev => ({
          ...prev,
          chats: prev.chats.map(chat =>
            chat.id === currentChat.id ? finalChat : chat
          ),
          isLoading: false,
        }));
        setStreamingContent('');
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error sending message:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setChatState(prev => ({
          ...prev,
          isLoading: false,
        }));
        setStreamingContent('');
      }
    }
  };

  // エクスポート機能
  const handleExportChats = () => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    const exportData = exportChats(chatState.chats, {
      includeSettings: true,
      selectedChatIds: [currentChat.id],
    });
    downloadChatsAsJson(exportData);
  };

  // インポート機能
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      setImportError('ファイルの読み込み中にエラーが発生しました。');
    };

    reader.onload = (e) => {
      try {
        if (typeof e.target?.result !== 'string') {
          throw new Error('ファイルの内容が不正です。');
        }

        console.log('File content:', e.target.result.slice(0, 100)); // デバッグ用に内容の一部を出力
        const importData = JSON.parse(e.target.result);
        console.log('Parsed data:', importData); // デバッグ用にパースされたデータを出力

        const result = importChats(importData, { keepExisting: false });
        console.log('Import result:', result); // デバッグ用にインポート結果を出力
        
        if (result.success) {
          // インポート成功後、チャット一覧を更新
          const loadedChats = loadChatsFromLocalStorage();
          setChatState(prev => ({
            ...prev,
            chats: loadedChats,
            currentChatId: loadedChats[0]?.id || null,
          }));
          setImportError(null);
          
          // 重複チャットの警告
          if (result.duplicateChats?.length) {
            setImportError(`${result.duplicateChats.length}件のチャットが重複していたため、新しいIDで保存されました。`);
          }
        } else {
          setImportError(result.error || 'インポートに失敗しました。');
        }
      } catch (error) {
        console.error('Import error:', error); // デバッグ用にエラーを出力
        setImportError(error instanceof Error ? error.message : 'ファイルの解析に失敗しました。');
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // ファイル選択をリセット
  };

  const currentChat = getCurrentChat();

  return (
    <div className="flex h-full">
      {/* サイドバー */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 mb-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Chat
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExportChats}
              className="flex-1 px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              disabled={!currentChat}
            >
              エクスポート
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              インポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {importError && (
          <div className="px-4 py-2 bg-red-500/10 border-y border-red-500/50 text-red-400 text-sm">
            {importError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatState.chats.map(chat => (
            <ChatTitle
              key={chat.id}
              title={chat.title}
              isActive={chat.id === chatState.currentChatId}
              hasChildren={getChildChats(chat.id, chatState.chats).length > 0}
              onUpdate={(newTitle) => handleUpdateTitle(chat.id, newTitle)}
              onSelect={() => handleSwitchChat(chat.id)}
              onDelete={(deleteChildren) => handleDeleteChat(chat.id, deleteChildren)}
            />
          ))}
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* モデルと設定 */}
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={currentChat?.model}
              onChange={(e) => handleModelChange(e.target.value as ModelType)}
              className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4-0125-preview">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5</option>
              <option value="claude">Claude</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              {currentChat?.model === 'gemini-pro' ? 'Gemini' : currentChat?.model === 'claude' ? 'Claude' : 'OpenAI'}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-white text-sm flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.useContext}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  useContext: e.target.checked,
                }))}
                className="form-checkbox rounded border-gray-700 bg-gray-800"
              />
              <span>Use Context</span>
            </label>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {currentChat?.messages.map((message) => (
            <ChatMessage key={message.timestamp} message={message} />
          ))}
          {streamingContent && (
            <ChatMessage
              message={{
                role: 'assistant',
                content: streamingContent,
                timestamp: Date.now(),
              }}
            />
          )}
          {error && (
            <div className="p-4 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
              Error: {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <ChatInput
            onSend={handleSendMessage}
            disabled={chatState.isLoading}
          />
        </div>
      </div>
    </div>
  );
};