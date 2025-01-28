import { Chat, Message, ChatContext, ModelType } from '../types/chat';

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
): ChatContext[] {
  const contexts: ChatContext[] = [];

  // 親チャットがある場合、その文脈を追加
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

  // 関連するチャットの文脈を追加
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
  contexts: ChatContext[]
): Message[] {
  const messages: Message[] = [];

  // 各文脈からのメッセージを追加
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

  // 現在のチャットのメッセージを追加
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
  const relatedIds = new Set<string>();
  
  // キーワードやフレーズの抽出（簡易的な実装）
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

// キーワード抽出（簡易実装）
function extractKeywords(messages: Message[]): Set<string> {
  const text = messages.map(m => m.content).join(' ').toLowerCase();
  const words = text.split(/\W+/);
  return new Set(words.filter(w => w.length > 3));
}

// 類似度計算（Jaccard類似度）
function calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}