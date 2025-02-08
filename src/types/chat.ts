export type ModelType = 
  | 'gpt-4'
  | 'gpt-4-0125-preview'
  | 'gpt-4-vision-preview'
  | 'gpt-3.5-turbo'
  | 'claude'
  | 'gemini-pro';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: ModelType;
  createdAt: number;
  updatedAt: number;
  parentId?: string;      // 親スレッドのID
  childrenIds?: string[]; // 子スレッドのID配列
  contextIds?: string[];  // 関連コンテキストのID配列
  summary?: string;
  continuation?: {        // スレッド継続情報
    fromId?: string;      // 継続元スレッドID
    toId?: string;        // 継続先スレッドID
    tokenCount: number;   // 現在のトークン数
  };
}

export interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  threadInfo?: {         // スレッド情報
    parentId?: string;
    childrenIds: string[];
    continuation?: {
      fromId?: string;
      toId?: string;
    };
  };
}

export interface ChatSettings {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  useContext: boolean;
  maxContextMessages: number;
  tokenLimit: number;     // トークン制限値
}

export const DEFAULT_SETTINGS: ChatSettings = {
  model: 'gpt-4-0125-preview',
  temperature: 0.7,
  maxTokens: 1000,
  useContext: true,
  maxContextMessages: 10,
  tokenLimit: 8000,       // デフォルトのトークン制限
};

export interface ChatContext {
  messages: Message[];
  summary?: string;
  chatId: string;
}

export interface DeleteChatOptions {
  deleteChildren?: boolean;
}

// エクスポート/インポート関連の型定義
export interface ChatExportData {
  version: string;
  exportedAt: number;
  chats: Chat[];
  settings: ChatSettings;
}

export interface ChatImportResult {
  success: boolean;
  importedChatsCount: number;
  error?: string;
  duplicateChats?: string[];
}

export interface ChatExportOptions {
  includeSettings?: boolean;
  selectedChatIds?: string[];
}

// トークン関連
export interface TokenInfo {
  count: number;
  limit: number;
  isNearLimit: boolean;
}

// スレッド関連
export interface ThreadInfo {
  id: string;
  parentId?: string;
  childrenIds: string[];
  continuation?: {
    fromId?: string;
    toId?: string;
  };
  tokenCount: number;
}

export interface CreateThreadOptions {
  parentId?: string;
  fromId?: string;
  initialMessages?: Message[];
  model: ModelType;
}