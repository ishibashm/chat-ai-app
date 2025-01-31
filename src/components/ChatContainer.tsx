'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatTitle } from './ChatTitle';
import { Chat, ChatState, Message, ModelType, ChatSettings, DEFAULT_SETTINGS } from '../types/chat';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // チャットタイトルの自動生成（最初のメッセージの場合）
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

  const currentChat = getCurrentChat();

  return (
    <div className="flex h-full bg-[#1a1a1a]">
      {/* サイドバー */}
      <div className="w-64 bg-[#141414] border-r border-[#2a2a2a] p-4">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 mb-4 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-colors"
        >
          New Chat
        </button>
        <div className="space-y-2">
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
      <div className="flex-1 flex flex-col bg-[#1a1a1a]">
        {/* モデルと設定 */}
        <div className="p-4 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between">
          <select
            value={currentChat?.model}
            onChange={(e) => handleModelChange(e.target.value as ModelType)}
            className="px-4 py-2 bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
          >
            <option value="gpt-4-0125-preview">GPT-4 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5</option>
            <option value="claude">Claude</option>
          </select>
          <div className="flex items-center space-x-4">
            <label className="text-white text-sm flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.useContext}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  useContext: e.target.checked,
                }))}
                className="form-checkbox rounded border-[#2a2a2a] bg-[#1a1a1a]"
              />
              <span>Use Context</span>
            </label>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4">
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
        <div className="border-t border-[#2a2a2a] bg-[#141414]">
          <ChatInput
            onSend={handleSendMessage}
            disabled={chatState.isLoading}
          />
        </div>
      </div>
    </div>
  );
};