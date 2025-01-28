import { Message, ModelType } from '../types/chat';

export async function generateChatResponse(
  messages: Message[],
  model: ModelType = 'gpt-3.5-turbo',
  onChunk?: (chunk: string) => void,
  onError?: (error: Error) => void
): Promise<string> {
  let abortController: AbortController | null = null;

  try {
    abortController = new AbortController();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    if (!onChunk) {
      const data = await response.json();
      return data.content;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request was aborted');
        } else {
          console.error('Error reading stream:', error);
          onError?.(error);
        }
      }
      throw error;
    } finally {
      reader.releaseLock();
    }

    return fullText;
  } catch (error) {
    console.error('Error generating chat response:', error);
    if (error instanceof Error) {
      onError?.(error);
    }
    throw error;
  } finally {
    if (abortController) {
      abortController.abort();
    }
  }
}

export function abortRequest() {
  // この関数は将来的に中断機能を実装する際に使用
  console.log('Request abort functionality will be implemented here');
}