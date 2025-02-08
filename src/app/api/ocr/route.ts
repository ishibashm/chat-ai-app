import { NextResponse } from 'next/server';

const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

export async function POST(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { 
        text: '',
        error: 'Google Cloud Vision APIのキーが設定されていません'
      },
      { status: 400 }
    );
  }

  try {
    const { imageData } = await request.json();
    if (!imageData) {
      return NextResponse.json({ text: '' });
    }

    // Base64データからヘッダーを削除
    const base64WithoutHeader = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(`${VISION_API_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64WithoutHeader
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Vision API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({ text: '' });
    }

    // 最初の要素が画像全体のテキスト
    const fullText = textAnnotations[0].description;
    
    return NextResponse.json({ text: fullText });

  } catch (error) {
    console.error('Error in OCR API:', error);
    return NextResponse.json(
      { text: '', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}