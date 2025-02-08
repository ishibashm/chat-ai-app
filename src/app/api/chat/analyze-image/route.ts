import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // GPT-4 Visionモデルを使用
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `この画像について以下の点を分析してください：
1. 画像内のテキストがある場合は、そのテキストを正確に抽出
2. 画像の主な内容の説明
3. 重要な詳細や特徴
できるだけ簡潔に日本語で回答してください。`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
                detail: 'high'  // 高精細な分析を要求
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const analysis = response.choices[0]?.message?.content || '画像の分析に失敗しました。';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}