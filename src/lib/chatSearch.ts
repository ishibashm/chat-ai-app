import { Chat, Message, ModelType } from '../types/chat';

export interface SearchFilters {
  startDate?: Date;
  endDate?: Date;
  model?: ModelType;
  keyword?: string;
}

export interface SearchResult {
  chat: Chat;
  matches: {
    messageIndex: number;
    content: string;
    highlight: string[];
  }[];
}

export async function searchChats(chats: Chat[], filters: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await fetch('/api/chat/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error('検索に失敗しました');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '検索に失敗しました');
    }

    // データベース実装までの一時的な処理として、
    // クライアントサイドでの検索を維持します
    return chats
      .filter((chat) => {
        // 日付フィルター
        if (filters.startDate && chat.createdAt < filters.startDate.getTime()) {
          return false;
        }
        if (filters.endDate && chat.createdAt > filters.endDate.getTime()) {
          return false;
        }

        // モデルフィルター
        if (filters.model && chat.model !== filters.model) {
          return false;
        }

        // キーワード検索
        if (filters.keyword) {
          const keyword = filters.keyword.toLowerCase();
          const hasMatch = chat.messages.some(
            (msg) => msg.content.toLowerCase().includes(keyword)
          );
          if (!hasMatch) {
            return false;
          }
        }

        return true;
      })
      .map((chat) => {
        const matches = findMatches(chat.messages, filters.keyword);
        return {
          chat,
          matches,
        };
      })
      .filter((result) => result.matches.length > 0);
  } catch (error) {
    console.error('検索エラー:', error);
    throw error;
  }
}

function findMatches(messages: Message[], keyword?: string) {
  if (!keyword) {
    return [];
  }

  const matches: {
    messageIndex: number;
    content: string;
    highlight: string[];
  }[] = [];

  messages.forEach((message, index) => {
    const content = message.content.toLowerCase();
    const searchKeyword = keyword.toLowerCase();

    if (content.includes(searchKeyword)) {
      // コンテキストを含むハイライト部分を抽出
      const segments = content.split(searchKeyword);
      const highlights: string[] = [];

      segments.forEach((segment, i) => {
        if (i < segments.length - 1) {
          const start = Math.max(0, segment.length - 30);
          const end = Math.min(
            content.length,
            segment.length + searchKeyword.length + 30
          );
          const highlight =
            (start > 0 ? '...' : '') +
            message.content.slice(start, end) +
            (end < message.content.length ? '...' : '');
          highlights.push(highlight);
        }
      });

      matches.push({
        messageIndex: index,
        content: message.content,
        highlight: highlights,
      });
    }
  });

  return matches;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}