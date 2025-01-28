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

  // テキスト内の数式を処理
  const processText = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;

    text.replace(codeBlockRegex, (match, language, code, index) => {
      if (index > lastIndex) {
        // コードブロック前のテキストを数式処理して追加
        const textBefore = text.slice(lastIndex, index);
        parts.push(...renderMathInText(textBefore));
      }
      // コードブロックを追加
      parts.push(
        <div key={index} className="my-4">
          <div className="flex items-center bg-[#1a1a1a] px-4 py-2 rounded-t-lg border-b border-[#2a2a2a]">
            <span className="text-xs text-[#666]">{language || 'text'}</span>
          </div>
          <CodeBlock
            language={language || 'text'}
            value={code.trim()}
          />
        </div>
      );
      lastIndex = index + match.length;
      return match;
    });

    // 残りのテキストを数式処理して追加
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(...renderMathInText(remainingText));
    }

    return parts;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`max-w-[85%] rounded-lg ${
          isUser
            ? 'bg-[#0ea5e9] text-white'
            : 'bg-[#1e293b] text-[#e2e8f0]'
        }`}
      >
        {/* メッセージヘッダー（AIの応答の場合のみ） */}
        {!isUser && (
          <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <span className="text-sm font-medium">Assistant</span>
          </div>
        )}

        {/* メッセージコンテンツ */}
        <div className="p-4">
          <ReactMarkdown
            className="prose prose-invert max-w-none"
            components={{
              // インラインコードの処理
              code: ({ inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code
                      className="bg-[#1a1a1a] text-[#0ea5e9] px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return null;
              },
              // 段落の処理（数式とコードブロックの処理を含む）
              p: ({ children }) => {
                if (typeof children === 'string') {
                  const processed = processText(children);
                  return <p className="mb-4 leading-relaxed">{processed}</p>;
                }
                return <p className="mb-4 leading-relaxed">{children}</p>;
              },
              // 見出しのスタイル
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
              // リストのスタイル
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
              // 引用のスタイル
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#2a2a2a] pl-4 my-4 italic">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};