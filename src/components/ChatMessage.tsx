import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat';
import { CodeBlock } from './CodeBlock';
import { renderMathInText } from './MathBlock';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // テキスト内の数式のみを処理
  const processText = (text: string) => {
    const parts = renderMathInText(text);
    return parts;
  };

  // OCRテキストを抽出
  const extractOcrText = (content: string) => {
    const match = content.match(/検出されたテキスト:\n(.*?)(?=\n\n|$)/s);
    return match ? match[1] : null;
  };

  // 画像を抽出（Markdown形式）
  const extractImages = (content: string) => {
    const matches = content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
    return Array.from(matches).map(match => ({
      alt: match[1],
      src: match[2]
    }));
  };

  // コンテンツからOCRテキストを除去
  const cleanContent = (content: string) => {
    return content.replace(/検出されたテキスト:\n.*?(?=\n\n|$)/s, '').trim();
  };

  const images = extractImages(message.content);
  const ocrText = extractOcrText(message.content);
  const cleanedContent = cleanContent(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`max-w-[85%] rounded-lg ${
          isUser
            ? 'bg-[#0ea5e9] text-white'
            : 'bg-[#1e293b] text-[#e2e8f0]'
        }`}
      >
        {/* メッセージヘッダー(AIの応答の場合のみ) */}
        {!isUser && (
          <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <span className="text-sm font-medium">Assistant</span>
          </div>
        )}

        {/* メッセージコンテンツ */}
        <div className="p-4">
          {/* 画像の表示 */}
          {images.length > 0 && (
            <div className="mb-4 space-y-4">
              {images.map((img, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border border-[#2a2a2a]">
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="max-w-full h-auto object-contain max-h-[300px]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* OCRテキストの表示 */}
          {ocrText && (
            <div className="mb-4 p-3 bg-[#2a2a2a] rounded-lg text-sm">
              <div className="font-medium mb-1 text-[#0ea5e9]">検出されたテキスト:</div>
              <div className="whitespace-pre-wrap">{ocrText}</div>
            </div>
          )}

          {/* メインコンテンツ */}
          <ReactMarkdown
            className="prose prose-invert max-w-none"
            components={{
              code: ({ inline, className, children, ...props }) => {
                const language = className ? className.replace('language-', '') : 'text';
                const value = String(children).replace(/\n$/, '');

                if (inline) {
                  return (
                    <code
                      className="bg-[#1a1a1a] text-[#0ea5e9] px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {value}
                    </code>
                  );
                }

                return (
                  <div className="my-4">
                    <CodeBlock language={language} value={value} />
                  </div>
                );
              },
              p: ({ children }) => {
                if (typeof children === 'string') {
                  const processed = processText(children);
                  if (Array.isArray(processed)) {
                    return (
                      <div className="space-y-4">
                        {processed.map((part, index) => {
                          if (typeof part === 'string') {
                            return <p key={index} className="leading-relaxed">{part}</p>;
                          }
                          return <div key={index}>{part}</div>;
                        })}
                      </div>
                    );
                  }
                }
                return <p className="mb-4 leading-relaxed">{children}</p>;
              },
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mb-4 pb-2 border-b border-[#2a2a2a]">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mb-3 mt-6">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold mb-2 mt-4">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-1">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#2a2a2a] pl-4 my-4 italic">
                  {children}
                </blockquote>
              ),
            }}
          >
            {cleanedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};