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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const title = await generateChatSummary([userMessage]);
      updatedChat.title = title || '新しいチャット';
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
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStreamingContent('');
      }
    }
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chats.map((chat: Chat) => (
            <ChatTitle
              key={chat.id}
              title={chat.title}
              isActive={chat.id === currentChatId}
              hasChildren={chats.some((c: Chat) => c.parentId === chat.id)}
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
                onChange={(e) => updateSettings({ useContext: e.target.checked })}
                className="form-checkbox rounded border-gray-700 bg-gray-800"
              />
              <span>Use Context</span>
            </label>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              Error: {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}