'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatTitle } from './ChatTitle';
import { Message, ModelType, Chat } from '../types/chat';
import { generateChatResponse } from '../lib/openai';
import { useChatContext } from '../lib/chatContext';
import {
  getRelatedContext,
  buildMessagesWithContext,
  createChildChat,
  detectRelatedChats,
  generateChatSummary,
} from '../lib/chatContext';

export function ChatContainer() {
  const {
    chats,
    currentChatId,
    isLoading,
    settings,
    updateSettings,
    addChat,
    updateChat,
    deleteChat: deleteContextChat,
    setCurrentChatId,
  } = useChatContext();

  const [streamingContent, setStreamingContent] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 画面サイズに応じてサイドバーの表示を制御
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentChat = () => {
    return chats.find((chat: Chat) => chat.id === currentChatId);
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentChat = getCurrentChat();
    const newChatData = currentChat ? createChildChat(currentChat) : {};
    const timestamp = Date.now();
    
    const newChat: Chat = {
      id: `chat-${timestamp}`,
      title: '新しいチャット',
      messages: [],
      model: currentChat?.model || 'gpt-4',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...newChatData,
    };

    addChat(newChat);
    setStreamingContent('');
    setError(null);
  };

  const handleSwitchChat = (chatId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCurrentChatId(chatId);
    setStreamingContent('');
    setError(null);
  };

  const handleUpdateTitle = async (chatId: string, newTitle: string) => {
    const chat = chats.find((c: Chat) => c.id === chatId);
    if (!chat) return;

    updateChat({
      ...chat,
      title: newTitle,
      updatedAt: Date.now(),
    });
  };

  const handleDeleteChat = (chatId: string, deleteChildren: boolean) => {
    deleteContextChat(chatId);
  };

  const handleModelChange = (model: ModelType) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    updateChat({
      ...currentChat,
      model,
      updatedAt: Date.now(),
    });
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

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      updatedAt: Date.now(),
    };

    // チャットタイトルの自動生成(最初のメッセージの場合)
    if (currentChat.messages.length === 0) {
      try {
        const titleResponse = await fetch('/api/chat/title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            model: currentChat.model,
          }),
        });

        if (titleResponse.ok) {
          const { title } = await titleResponse.json();
          updatedChat.title = title || '新しいチャット';
        } else {
          throw new Error('タイトル生成に失敗しました');
        }
      } catch (error) {
        console.error('タイトル生成エラー:', error);
        updatedChat.title = '新しいチャット';
      }
    }

    // 関連するチャットの文脈を取得
    const contexts = settings.useContext
      ? getRelatedContext(updatedChat, chats, settings.maxContextMessages)
      : [];

    // 文脈を含めたメッセージを構築
    const messagesWithContext = buildMessagesWithContext(updatedChat.messages, contexts);

    updateChat(updatedChat);
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

        const finalChat = {
          ...updatedChat,
          messages: [...updatedChat.messages, assistantMessage],
          updatedAt: Date.now(),
        };

        // 関連するチャットを検出して更新
        const relatedChatIds = detectRelatedChats(finalChat, chats);
        finalChat.contextIds = [...new Set([...(finalChat.contextIds || []), ...relatedChatIds])];

        updateChat(finalChat);
        setStreamingContent('');
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error sending message:', error);
        setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
        setStreamingContent('');
      }
    }
  };

  const currentChat = getCurrentChat();

  return (
    <div className="flex h-full relative">
      {/* サイドバートグルボタン（モバイル） */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg text-white"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* サイドバー */}
      <div
        className={`
          absolute lg:relative z-[55] w-64 h-full bg-gray-900 border-r border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 mb-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新規チャット
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chats.map((chat: Chat) => (
            <ChatTitle
              key={chat.id}
              title={chat.title}
              isActive={chat.id === currentChatId}
              hasChildren={chats.some((c: Chat) => c.parentId === chat.id)}
              onUpdate={(newTitle) => handleUpdateTitle(chat.id, newTitle)}
              onSelect={() => {
                handleSwitchChat(chat.id);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              onDelete={(deleteChildren) => handleDeleteChat(chat.id, deleteChildren)}
            />
          ))}
        </div>
      </div>

      {/* オーバーレイ（モバイル） */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* メインチャットエリア */}
      <div className={`flex-1 flex flex-col bg-gray-900 min-w-0 h-screen pr-[20px]`}>
        {/* モデルと設定 */}
        <div className="flex-none p-4 border-b border-gray-800 bg-gray-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={currentChat?.model}
                onChange={(e) => handleModelChange(e.target.value as ModelType)}
                className="w-full sm:w-auto px-3 py-1.5 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="gpt-4-0125-preview">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5</option>
                <option value="claude">Claude</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>
              <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                {currentChat?.model === 'gemini-pro' ? 'Gemini' : currentChat?.model === 'claude' ? 'Claude' : 'OpenAI'}
              </div>
            </div>
            <div className="flex items-center">
              <label className="text-white text-sm flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.useContext}
                  onChange={(e) => updateSettings({ useContext: e.target.checked })}
                  className="form-checkbox rounded border-gray-700 bg-gray-800"
                />
                <span>コンテキストを使用</span>
              </label>
            </div>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 min-h-0">
          <div className="pb-20">
            <div className="py-4 sm:py-6 space-y-4 sm:space-y-6 min-h-full px-4">
              {currentChat?.messages.map((message: Message) => (
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
                  エラー: {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* 入力エリア */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900 pr-[20px] z-[56]">
          <div className="py-3 sm:py-4 bg-gray-900 px-4">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading || !currentChatId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}