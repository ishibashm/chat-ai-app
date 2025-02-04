'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Chat, ChatState, ChatSettings, DEFAULT_SETTINGS, ChatExportData, ChatImportResult, Message, ChatContext as ChatContextType, ModelType } from '../types/chat';

// チャットの要約を生成するためのプロンプト
const SUMMARY_PROMPT = 'このチャットの主なトピックと重要なポイントを1-2文で要約してください。';

// チャットの要約を生成
export async function generateChatSummary(messages: Message[]): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: SUMMARY_PROMPT, timestamp: Date.now() }],
        model: 'gpt-3.5-turbo',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error generating summary:', error);
    return '';
  }
}

// 関連するチャットの文脈を取得
export function getRelatedContext(
  currentChat: Chat,
  allChats: Chat[],
  maxContextMessages: number
): ChatContextType[] {
  const contexts: ChatContextType[] = [];

  if (currentChat.parentId) {
    const parentChat = allChats.find(chat => chat.id === currentChat.parentId);
    if (parentChat) {
      contexts.push({
        messages: parentChat.messages.slice(-maxContextMessages),
        summary: parentChat.summary,
        chatId: parentChat.id,
      });
    }
  }

  if (currentChat.contextIds) {
    for (const contextId of currentChat.contextIds) {
      const contextChat = allChats.find(chat => chat.id === contextId);
      if (contextChat) {
        contexts.push({
          messages: contextChat.messages.slice(-maxContextMessages),
          summary: contextChat.summary,
          chatId: contextChat.id,
        });
      }
    }
  }

  return contexts;
}

// 文脈を含めたメッセージ配列を生成
export function buildMessagesWithContext(
  currentMessages: Message[],
  contexts: ChatContextType[]
): Message[] {
  const messages: Message[] = [];

  for (const context of contexts) {
    if (context.summary) {
      messages.push({
        role: 'system',
        content: `Previous chat context (${context.chatId}): ${context.summary}`,
        timestamp: Date.now(),
      });
    }
    messages.push(...context.messages);
    messages.push({
      role: 'system',
      content: '---End of previous context---',
      timestamp: Date.now(),
    });
  }

  messages.push(...currentMessages);
  return messages;
}

// 新しいチャットを作成する際に親チャットを設定
export function createChildChat(
  parentChat: Chat,
  model: ModelType = parentChat.model
): Partial<Chat> {
  return {
    parentId: parentChat.id,
    contextIds: [parentChat.id],
    model,
  };
}

// チャット間の関連性を検出
export function detectRelatedChats(
  currentChat: Chat,
  allChats: Chat[],
  maxRelated: number = 3
): string[] {
  // キーワードやフレーズの抽出(簡易的な実装)
  const currentKeywords = extractKeywords(currentChat.messages);
  
  // 類似度に基づいてチャットをソート
  const similarities = allChats
    .filter(chat => chat.id !== currentChat.id)
    .map(chat => ({
      id: chat.id,
      similarity: calculateSimilarity(currentKeywords, extractKeywords(chat.messages)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxRelated);

  return similarities.map(s => s.id);
}

// キーワード抽出(簡易実装)
function extractKeywords(messages: Message[]): Set<string> {
  const text = messages.map(m => m.content).join(' ').toLowerCase();
  const words = text.split(/\W+/);
  return new Set(words.filter(w => w.length > 3));
}

// 類似度計算(Jaccard類似度)
function calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

interface ChatContextValue {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chat: Chat) => void;
  deleteChat: (id: string) => void;
  settings: ChatSettings;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  exportChats: (selectedChatIds?: string[]) => Promise<ChatExportData>;
  importChats: (data: ChatExportData) => Promise<ChatImportResult>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ChatState>({
    chats: [],
    currentChatId: null,
    isLoading: false,
  });

  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedSettings = localStorage.getItem('chatSettings');
    
    if (savedChats) {
      setState(prev => ({
        ...prev,
        chats: JSON.parse(savedChats),
      }));
    }
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(state.chats));
  }, [state.chats]);

  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(settings));
  }, [settings]);

  const setCurrentChatId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, currentChatId: id }));
  }, []);

  const addChat = useCallback((chat: Chat) => {
    setState(prev => ({
      ...prev,
      chats: [...prev.chats, chat],
      currentChatId: chat.id,
    }));
  }, []);

  const updateChat = useCallback((chat: Chat) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(c => c.id === chat.id ? chat : c),
    }));
  }, []);

  const deleteChat = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.filter(c => c.id !== id),
      currentChatId: prev.currentChatId === id ? null : prev.currentChatId,
    }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const exportChats = useCallback(async (selectedChatIds?: string[]): Promise<ChatExportData> => {
    const chatsToExport = selectedChatIds
      ? state.chats.filter(chat => selectedChatIds.includes(chat.id))
      : state.chats;

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      chats: chatsToExport,
      settings,
    };
  }, [state.chats, settings]);

  const importChats = useCallback(async (data: ChatExportData): Promise<ChatImportResult> => {
    try {
      if (data.version !== '1.0.0') {
        return {
          success: false,
          importedChatsCount: 0,
          error: '互換性のないバージョンです',
        };
      }

      const existingIds = new Set(state.chats.map(chat => chat.id));
      const duplicateChats = data.chats.filter(chat => existingIds.has(chat.id));
      const newChats = data.chats.filter(chat => !existingIds.has(chat.id));

      setState(prev => ({
        ...prev,
        chats: [...prev.chats, ...newChats],
      }));

      if (data.settings) {
        setSettings(data.settings);
      }

      return {
        success: true,
        importedChatsCount: newChats.length,
        duplicateChats: duplicateChats.map(chat => chat.id),
      };
    } catch (error) {
      return {
        success: false,
        importedChatsCount: 0,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      };
    }
  }, [state.chats]);

  const value: ChatContextValue = {
    ...state,
    setCurrentChatId,
    addChat,
    updateChat,
    deleteChat,
    settings,
    updateSettings,
    exportChats,
    importChats,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

export { ChatContext };