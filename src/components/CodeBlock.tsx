import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 言語名を表示用に整形
  const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div className="rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#141414]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">{displayLanguage}</span>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-sm bg-[#2a2a2a] text-gray-300 rounded-md hover:bg-[#3a3a3a] transition-colors flex items-center space-x-1"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>コピーしました</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              <span>コピー</span>
            </>
          )}
        </button>
      </div>

      {/* コードブロック */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={false}
          wrapLines={true}
          customStyle={{
            margin: 0,
            background: '#141414',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            textAlign: 'right',
            color: '#4a5568',
            backgroundColor: '#1a1a1a',
            marginRight: '1em',
            borderRight: '1px solid #2a2a2a',
            userSelect: 'none',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            },
          }}
          className="!bg-[#141414] !p-4 !overflow-x-auto"
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};