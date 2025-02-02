import { Chat, ModelType, DeleteChatOptions, ChatExportData, ChatImportResult, ChatExportOptions, ChatSettings, DEFAULT_SETTINGS } from '../types/chat';

export function generateChatId(): string {
  return Math.random().toString(36).substring(2, 15);
}

interface CreateNewChatOptions {
  model?: ModelType;
  parentId?: string;
  contextIds?: string[];
}

export function createNewChat(options: CreateNewChatOptions = {}): Chat {
  const now = Date.now();
  return {
    id: generateChatId(),
    title: '新しいチャット',
    messages: [],
    model: options.model || 'gpt-4-0125-preview',
    createdAt: now,
    updatedAt: now,
    parentId: options.parentId,
    contextIds: options.contextIds,
  };
}

export function saveChatsToLocalStorage(chats: Chat[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chats', JSON.stringify(chats));
  }
}

export function loadChatsFromLocalStorage(): Chat[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const saved = localStorage.getItem('chats');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
}

export async function generateChatTitle(content: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'このチャットの内容を20文字以内で要約してタイトルを生成してください。',
            timestamp: Date.now(),
          },
          {
            role: 'user',
            content,
            timestamp: Date.now(),
          },
        ],
        model: 'gpt-3.5-turbo',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate title');
    }

    const data = await response.json();
    return data.content.replace(/["""]/g, '').trim() || '新しいチャット';
  } catch (error) {
    console.error('Error generating chat title:', error);
    return '新しいチャット';
  }
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function updateChatTitle(chat: Chat, newTitle: string): Chat {
  return {
    ...chat,
    title: newTitle,
    updatedAt: Date.now(),
  };
}

export function getChildChats(chatId: string, chats: Chat[]): Chat[] {
  return chats.filter(chat => chat.parentId === chatId);
}

export function getAllDescendantIds(chatId: string, chats: Chat[]): string[] {
  const descendants: string[] = [];
  const stack = [chatId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const children = chats.filter(chat => chat.parentId === currentId);
    
    for (const child of children) {
      descendants.push(child.id);
      stack.push(child.id);
    }
  }

  return descendants;
}

export function deleteChat(chatId: string, chats: Chat[], options: DeleteChatOptions = {}): Chat[] {
  if (options.deleteChildren) {
    const descendantIds = getAllDescendantIds(chatId, chats);
    const idsToDelete = new Set([chatId, ...descendantIds]);
    return chats.filter(chat => !idsToDelete.has(chat.id));
  } else {
    // 子チャットの親IDを更新
    const parentChat = chats.find(chat => chat.id === chatId);
    const updatedChats = chats.map(chat => 
      chat.parentId === chatId
        ? { ...chat, parentId: parentChat?.parentId }
        : chat
    );
    return updatedChats.filter(chat => chat.id !== chatId);
  }
}

// エクスポート機能
export function exportChats(chats: Chat[], options: ChatExportOptions = {}): ChatExportData {
  const selectedChats = options.selectedChatIds
    ? chats.filter(chat => options.selectedChatIds?.includes(chat.id))
    : chats;

  const exportData: ChatExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    chats: selectedChats,
    settings: options.includeSettings 
      ? (localStorage.getItem('chatSettings') 
          ? JSON.parse(localStorage.getItem('chatSettings')!) 
          : DEFAULT_SETTINGS)
      : DEFAULT_SETTINGS,
  };

  return exportData;
}

// JSONファイルとしてエクスポート
export function downloadChatsAsJson(exportData: ChatExportData): void {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-export-${formatDate(Date.now())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ImportOptions {
  keepExisting?: boolean;
}

// インポート機能
export function importChats(importData: unknown, options: ImportOptions = {}): ChatImportResult {
  try {
    // 型チェック
    if (!isValidChatExportData(importData)) {
      return {
        success: false,
        importedChatsCount: 0,
        error: '無効なインポートデータ形式です',
      };
    }

    // 既存のチャットを読み込み
    const existingChats = options.keepExisting ? loadChatsFromLocalStorage() : [];
    const existingIds = new Set(existingChats.map(chat => chat.id));
    const duplicateChats: string[] = [];

    // 重複チェックと新しいIDの生成
    const processedChats = importData.chats.map(chat => {
      if (existingIds.has(chat.id)) {
        duplicateChats.push(chat.id);
        // 新しいIDを生成
        const newId = generateChatId();
        return {
          ...chat,
          id: newId,
          parentId: undefined, // 親子関係はリセット
          contextIds: [], // コンテキスト関係もリセット
        };
      }
      return chat;
    });

    // チャットを保存
    const updatedChats = options.keepExisting
      ? [...existingChats, ...processedChats]
      : processedChats;
    saveChatsToLocalStorage(updatedChats);

    // 設定のインポート(オプション)
    if (importData.settings) {
      localStorage.setItem('chatSettings', JSON.stringify(importData.settings));
    }

    return {
      success: true,
      importedChatsCount: processedChats.length,
      duplicateChats: duplicateChats.length > 0 ? duplicateChats : undefined,
    };
  } catch (error) {
    return {
      success: false,
      importedChatsCount: 0,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
}

// インポートデータの型チェック
function isValidChatExportData(data: any): data is ChatExportData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.version === 'string' &&
    typeof data.exportedAt === 'number' &&
    Array.isArray(data.chats) &&
    data.chats.every((chat: any) =>
      typeof chat === 'object' &&
      chat !== null &&
      typeof chat.id === 'string' &&
      typeof chat.title === 'string' &&
      Array.isArray(chat.messages) &&
      typeof chat.model === 'string' &&
      typeof chat.createdAt === 'number' &&
      typeof chat.updatedAt === 'number'
    )
  );
}