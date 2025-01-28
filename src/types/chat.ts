export type ModelType = 
  | 'gpt-4'
  | 'gpt-4-0125-preview'  // GPT-4 Turbo
  | 'gpt-3.5-turbo'
  | 'claude';

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
  parentId?: string;
  contextIds?: string[];
  summary?: string;
}

export interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
}

export interface ChatSettings {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  useContext: boolean;
  maxContextMessages: number;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  model: 'gpt-4-0125-preview',
  temperature: 0.7,
  maxTokens: 1000,
  useContext: true,
  maxContextMessages: 10,
};

export interface ChatContext {
  messages: Message[];
  summary?: string;
  chatId: string;
}

export interface DeleteChatOptions {
  deleteChildren?: boolean;
}