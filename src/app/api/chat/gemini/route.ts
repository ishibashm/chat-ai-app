import { NextResponse } from 'next/server';
import { Message } from '@/types/chat';

// Gemini Pro Vision APIのエンドポイント
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
const API_KEY = process.env.GOOGLE_AI_API_KEY;

function isBase64Image(str: string) {
  try {
    return str.startsWith('data:image/');
  } catch {
    return false;
  }
}

function extractBase64Data(base64String: string) {
  const match = base64String.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const { messages } = await request.json();

    // メッセージ履歴を構築（画像以外のメッセージのみ）
    const history = messages.slice(0, -1)
      .filter((msg: Message) => !isBase64Image(msg.content))
      .map((msg: Message) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    // 最後のメッセージを取得
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('Empty message content');
    }

    // メッセージ内の画像を探す
    const parts: any[] = [];
    const segments = lastMessage.content.split(/(!?\[.*?\]\(data:image\/.*?\))/);
    let hasImage = false;

    for (const segment of segments) {
      if (isBase64Image(segment)) {
        hasImage = true;
        const base64Data = extractBase64Data(segment);
        if (base64Data) {
          parts.push({
            inlineData: {
              mimeType: segment.split(';')[0].split(':')[1],
              data: base64Data
            }
          });
        }
      } else if (segment.trim()) {
        parts.push({ text: segment.trim() });
      }
    }

    if (!hasImage) {
      // 画像が含まれていない場合は通常のテキストモデルを使用
      const textEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const response = await fetch(`${textEndpoint}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...history,
            {
              role: 'user',
              parts: [{ text: lastMessage.content }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Invalid response format from Gemini API');
      }

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Vision APIリクエスト
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          ...history,
          {
            role: 'user',
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini Vision API failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Invalid response format from Gemini Vision API');
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in Gemini chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}