import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message, ModelType } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, model } = await request.json();

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4',
      messages: [
        { role: 'user', content: message },
        { role: 'user', content: 'このチャットの内容を20文字程度で要約してタイトルを作成してください。' }
      ],
      temperature: 0.7,
      max_tokens: 50,
      stream: false
    });

    const title = completion.choices[0]?.message?.content || '新しいチャット';

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}