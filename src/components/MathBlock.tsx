import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  math: string;
  display?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({ math, display = false }) => {
  const html = katex.renderToString(math, {
    displayMode: display,
    throwOnError: false,
    trust: true,
    strict: false,
  });

  return (
    <div
      className={`${display ? 'math-block' : 'math-inline'}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// LaTeX数式のパターンを検出する正規表現
export const INLINE_MATH_REGEX = /\$([^\$]+)\$/g;
export const BLOCK_MATH_REGEX = /\$\$([^\$]+)\$\$/g;

// LaTeX数式をレンダリングする関数
export function renderMathInText(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;

  // ブロック数式を処理
  text.replace(BLOCK_MATH_REGEX, (match, math, index) => {
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push(
      <div key={index} className="math-block-wrapper">
        <div className="math-block-content">
          <MathBlock key={`math-${index}`} math={math} display={true} />
        </div>
      </div>
    );
    lastIndex = index + match.length;
    return match;
  });

  // 残りのテキストをインライン数式で処理
  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    const inlineParts = remainingText.split(INLINE_MATH_REGEX);
    for (let i = 0; i < inlineParts.length; i++) {
      if (i % 2 === 0) {
        if (inlineParts[i]) parts.push(inlineParts[i]);
      } else {
        parts.push(
          <MathBlock key={`inline-${i}`} math={inlineParts[i]} display={false} />
        );
      }
    }
  }

  return parts;
}