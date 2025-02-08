import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message, ModelType, TokenInfo } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TOKEN_LIMIT = 8000;
const WARNING_THRESHOLD = 7000;

// トークン数を概算する関数
function estimateTokens(text: string): number {
  // 単純な推定: 英単語は4文字、日本語は2文字で1トークン程度
  const japanese = text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/g)?.length || 0;
  const other = text.length - japanese;
  return Math.ceil(japanese / 2 + other / 4);
}

// トークン情報を取得
function getTokenInfo(messages: Message[]): TokenInfo {
  const count = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  return {
    count,
    limit: TOKEN_LIMIT,
    isNearLimit: count > WARNING_THRESHOLD
  };
}

async function* streamOpenAIResponse(messages: Message[], model: string) {
  try {
    let tokenCount = 0;
    let needsNewThread = false;
    let responseBuffer = '';

    // GPT-4 Visionを使用する場合の処理
    if (model === 'gpt-4-vision-preview') {
      const lastMessage = messages[messages.length - 1];
      const content: any[] = [];

      // メッセージを解析して画像とテキストを分離
      const segments = lastMessage.content.split(/(!?\[.*?\]\(data:image\/.*?\))/);
      let hasImage = false;

      for (const segment of segments) {
        if (segment.startsWith('data:image/')) {
          hasImage = true;
          content.push({
            type: 'image_url',
            image_url: {
              url: segment,
              detail: 'auto'
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
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            tokenCount += estimateTokens(content);
            if (tokenCount > TOKEN_LIMIT) {
              needsNewThread = true;
              yield '\n\n[続きは新しいスレッドで...]';
              break;
            }
            yield content;
          }
        }
        return;
      }

      // Vision APIリクエスト
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          ...messages.slice(0, -1).map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: content
          }
        ],
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          tokenCount += estimateTokens(content);
          if (tokenCount > TOKEN_LIMIT) {
            needsNewThread = true;
            yield '\n\n[続きは新しいスレッドで...]';
            break;
          }
          yield content;
        }
      }
    } else {
      // 通常のGPTモデルの処理
      const response = await openai.chat.completions.create({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          tokenCount += estimateTokens(content);
          responseBuffer += content;

          if (tokenCount > TOKEN_LIMIT) {
            needsNewThread = true;
            yield '\n\n[続きは新しいスレッドで...]';
            break;
          }
          yield content;
        }
      }
    }

    // トークン制限に達した場合、新しいスレッドの作成をトリガー
    if (needsNewThread) {
      yield JSON.stringify({
        type: 'thread_continuation',
        tokenCount,
        remainingContent: responseBuffer
      });
    }
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw error;
  }
}

async function* streamClaudeResponse(messages: Message[]) {
  try {
    let tokenCount = 0;
    let needsNewThread = false;
    let responseBuffer = '';

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
        messages: messages.map(msg => ({
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
                const content = data.delta.text;
                tokenCount += estimateTokens(content);
                responseBuffer += content;

                if (tokenCount > TOKEN_LIMIT) {
                  needsNewThread = true;
                  yield '\n\n[続きは新しいスレッドで...]';
                  break;
                }
                yield content;
              }
            } catch (e) {
              console.error('Error parsing Claude response:', e);
              continue;
            }
          }
        }

        if (needsNewThread) break;
      }
    } finally {
      reader.releaseLock();
    }

    if (needsNewThread) {
      yield JSON.stringify({
        type: 'thread_continuation',
        tokenCount,
        remainingContent: responseBuffer
      });
    }
  } catch (error) {
    console.error('Claude streaming error:', error);
    throw error;
  }
}

async function* streamGeminiResponse(messages: Message[], request: Request) {
  try {
    let tokenCount = 0;
    let needsNewThread = false;
    let responseBuffer = '';

    const url = new URL(request.url);
    const geminiUrl = new URL('/api/chat/gemini', url.origin);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
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
        tokenCount += estimateTokens(chunk);
        responseBuffer += chunk;

        if (tokenCount > TOKEN_LIMIT) {
          needsNewThread = true;
          yield '\n\n[続きは新しいスレッドで...]';
          break;
        }
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }

    if (needsNewThread) {
      yield JSON.stringify({
        type: 'thread_continuation',
        tokenCount,
        remainingContent: responseBuffer
      });
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
    
    // トークン数をチェック
    const tokenInfo = getTokenInfo(messages);
    const lastMessage = messages[messages.length - 1];
    const hasImage = lastMessage.content.includes('data:image/');
    
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
          console.error('Streaming error:', error);
          controller.error(error);
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