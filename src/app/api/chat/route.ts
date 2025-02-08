import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message, ModelType } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TOKENS_PER_REQUEST = 6000; // 安全なマージン
const MAX_MESSAGES_HISTORY = 10;     // 履歴の制限

// Base64形式の画像かどうかを判定
function isBase64Image(str: string) {
  try {
    return str.startsWith('data:image/');
  } catch {
    return false;
  }
}

// メッセージ履歴を最適化
function optimizeMessages(messages: Message[]): Message[] {
  // 最新のメッセージを優先的に保持
  if (messages.length > MAX_MESSAGES_HISTORY) {
    messages = messages.slice(-MAX_MESSAGES_HISTORY);
  }

  return messages.map(msg => ({
    role: msg.role,
    content: optimizeMessageContent(msg.content),
    timestamp: msg.timestamp,  // タイムスタンプを維持
  }));
}

// APIに送信するメッセージを準備
function prepareApiMessages(messages: Message[]) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

// メッセージ内容を最適化
function optimizeMessageContent(content: string): string {
  // Base64画像を [画像] プレースホルダーに置換
  content = content.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '[画像]');
  
  // OCRテキストを圧縮（重複除去）
  if (content.includes('検出されたテキスト:')) {
    const lines = content.split('\n');
    const ocrTextIndex = lines.findIndex(line => line.includes('検出されたテキスト:'));
    if (ocrTextIndex >= 0) {
      const ocrText = lines[ocrTextIndex + 1];
      // OCRテキストの周辺の空行を削除
      lines.splice(ocrTextIndex, 2, `検出されたテキスト: ${ocrText.trim()}`);
      content = lines.join('\n');
    }
  }

  return content.trim();
}

async function* streamOpenAIResponse(messages: Message[], model: string) {
  try {
    // メッセージを最適化
    const optimizedMessages = optimizeMessages(messages);
    const apiMessages = prepareApiMessages(optimizedMessages);

    console.log('送信メッセージ:', JSON.stringify(apiMessages, null, 2));

    // GPT-4 Visionを使用する場合の処理
    if (model === 'gpt-4-vision-preview') {
      const lastMessage = optimizedMessages[optimizedMessages.length - 1];
      const content: any[] = [];

      // メッセージを解析して画像とテキストを分離
      const segments = lastMessage.content.split(/(!?\[.*?\]\(data:image\/.*?\))/);
      let hasImage = false;

      for (const segment of segments) {
        if (isBase64Image(segment)) {
          hasImage = true;
          content.push({
            type: 'image_url',
            image_url: {
              url: segment,
              detail: 'low'  // 画質を下げてトークン数を削減
            }
          });
        } else if (segment.trim()) {
          content.push({
            type: 'text',
            text: segment.trim()
          });
        }
      }

      if (!hasImage) {
        // 画像がない場合は通常のモデルを使用
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        });

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
        return;
      }

      // Vision APIリクエスト
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          ...apiMessages.slice(0, -1),
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } else {
      // 通常のGPTモデルの処理
      const response = await openai.chat.completions.create({
        model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw error;
  }
}

async function* streamClaudeResponse(messages: Message[]) {
  try {
    // メッセージを最適化
    const optimizedMessages = optimizeMessages(messages);
    const apiMessages = prepareApiMessages(optimizedMessages);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: apiMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    try {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                yield data.delta.text;
              }
            } catch (e) {
              console.error('Error parsing Claude response:', e);
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Claude streaming error:', error);
    throw error;
  }
}

async function* streamGeminiResponse(messages: Message[], request: Request) {
  try {
    // メッセージを最適化
    const optimizedMessages = optimizeMessages(messages);
    const apiMessages = prepareApiMessages(optimizedMessages);

    const url = new URL(request.url);
    const geminiUrl = new URL('/api/chat/gemini', url.origin);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    try {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Gemini streaming error:', error);
    throw error;
  }
}

function getModelName(model: ModelType, hasImage: boolean): string {
  if (hasImage) {
    switch (model) {
      case 'gpt-4':
      case 'gpt-4-0125-preview':
      case 'gpt-3.5-turbo':
        return 'gpt-4-vision-preview';
      default:
        return model;
    }
  }

  switch (model) {
    case 'gpt-4':
      return 'gpt-4';
    case 'gpt-4-0125-preview':
      return 'gpt-4-0125-preview';
    case 'gpt-4-vision-preview':
      return 'gpt-4-vision-preview';
    case 'gpt-3.5-turbo':
      return 'gpt-3.5-turbo';
    case 'claude':
      return 'claude-3-opus-20240229';
    case 'gemini-pro':
      return 'gemini-pro';
    default:
      return 'gpt-4-0125-preview';
  }
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const { messages, model } = await request.json();
    
    // 画像の有無を確認
    const lastMessage = messages[messages.length - 1];
    const hasImage = isBase64Image(lastMessage.content);
    
    const modelName = getModelName(model as ModelType, hasImage);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let generator;
          if (model === 'claude') {
            generator = streamClaudeResponse(messages);
          } else if (model === 'gemini-pro') {
            generator = streamGeminiResponse(messages, request);
          } else {
            generator = streamOpenAIResponse(messages, modelName);
          }

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          if (error instanceof Error && error.message.includes('too large')) {
            controller.enqueue(encoder.encode(
              '申し訳ありませんが、メッセージが長すぎるため処理できません。より短いメッセージで試してください。'
            ));
            controller.close();
          } else {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}