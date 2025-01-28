import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message, ModelType } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function* streamOpenAIResponse(messages: Message[], model: string) {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
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
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw error;
  }
}

async function* streamClaudeResponse(messages: Message[]) {
  try {
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

function getModelName(model: ModelType): string {
  switch (model) {
    case 'gpt-4':
      return 'gpt-4';
    case 'gpt-4-0125-preview':
      return 'gpt-4-0125-preview';
    case 'gpt-3.5-turbo':
      return 'gpt-3.5-turbo';
    case 'claude':
      return 'claude-3-opus-20240229';
    default:
      return 'gpt-4-0125-preview';
  }
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  try {
    const { messages, model } = await request.json();
    const modelName = getModelName(model as ModelType);

    const stream = new ReadableStream({
      start(c) {
        controller = c;
      },
      async pull(controller) {
        try {
          let generator;
          if (model === 'claude') {
            generator = streamClaudeResponse(messages);
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
      },
      cancel() {
        if (controller) {
          try {
            controller.close();
          } catch (e) {
            console.error('Error closing stream:', e);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    if (controller) {
      try {
        controller.close();
      } catch (e) {
        console.error('Error closing stream on error:', e);
      }
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}