import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 画像のMarkdown記法を除去する関数
function removeImageMarkdown(text: string): string {
  return text.replace(/!\[.*?\]\(.*?\)/g, '[画像]');
}

// OCRテキストを除去する関数
function removeOcrText(text: string): string {
  return text.replace(/検出されたテキスト:\n.*?(?=\n\n|$)/s, '');
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // 画像とOCRテキストを除去してタイトル生成用のテキストを作成
    const cleanMessage = removeOcrText(removeImageMarkdown(message));

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // タイトル生成には3.5を使用してトークンを節約
      messages: [
        { 
          role: 'system', 
          content: '以下のメッセージに対して、15文字以内の簡潔なタイトルを日本語で生成してください。句読点は含めないでください。' 
        },
        { role: 'user', content: cleanMessage },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'New Chat';
    
    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}