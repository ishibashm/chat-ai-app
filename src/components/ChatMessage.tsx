import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat';
import { CodeBlock } from './CodeBlock';
import { renderMathInText } from './MathBlock';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // テキスト内の数式のみを処理
  const processText = (text: string) => {
    const parts = renderMathInText(text);
    return parts;
  };

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div
          className={`max-w-[85%] rounded-lg ${
            isUser
              ? 'bg-[#0ea5e9] text-white'
              : 'bg-[#1e293b] text-[#e2e8f0]'
          }`}
        >
          {!isUser && (
            <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
              <span className="text-sm font-medium">Assistant</span>
            </div>
          )}

          <div className="p-4">
            <ReactMarkdown
              className="prose prose-invert max-w-none"
              components={{
                img: ({ src, alt }) => (
                  <div className="mb-2">
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setExpandedImage(src || null)}
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                ),
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
                              return <p key={index}>{part}</p>;
                            }
                            return <div key={index}>{part}</div>;
                          })}
                        </div>
                      );
                    }
                  }
                  return <p>{children}</p>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
              onClick={() => setExpandedImage(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};