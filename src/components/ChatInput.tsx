import React, { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

interface ImagePreview {
  url: string;
  name: string;
  ocrText?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imagePreview) && !disabled && !isProcessing) {
      // 画像プレビューがある場合、その情報を含めて送信
      let message = input.trim();
      if (imagePreview) {
        const imageMarkdown = `![${imagePreview.name}](${imagePreview.url})\n\n`;
        if (message) {
          message = `${imageMarkdown}${message}`;
        } else {
          message = imageMarkdown;
        }
      }
      onSend(message);
      setInput('');
      setImagePreview(null);
    }
  };

  const processImageWithOCR = async (imageData: string) => {
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const data = await response.json();
      if (data.text) {
        onSend(`![OCR Result](${imageData})\n\n検出されたテキスト:\n${data.text}`);
      }
      return data.text;
    } catch (error) {
      console.error('OCR error:', error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);

      if (file.type.startsWith('image/')) {
        // 画像ファイルの処理
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          setImagePreview({ url: base64, name: file.name });
          
          // OCR処理を実行
          await processImageWithOCR(base64);
        };
        reader.readAsDataURL(file);
      } else {
        // テキストファイルの処理
        const text = await file.text();
        setInput((prev) => {
          const prefix = prev ? `${prev}\n\n` : '';
          return `${prefix}ファイルの内容:\n${text}`;
        });
      }
    } catch (error) {
      console.error('ファイルの読み込みエラー:', error);
      alert('ファイルの読み込みに失敗しました。');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImagePreview = () => {
    setImagePreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 sm:p-4">
      {/* プレビュー表示エリア */}
      {imagePreview && (
        <div className="relative">
          <div className="relative group rounded-lg overflow-hidden border border-[#2a2a2a] max-w-[200px]">
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="w-full h-auto object-contain max-h-[200px]"
            />
            <button
              type="button"
              onClick={removeImagePreview}
              className="absolute top-2 right-2 bg-[#1e293b] text-white rounded-full p-1
                opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-[#2a3441] active:bg-[#1a2533]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors text-sm
            min-w-[40px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center
            ${
              disabled || isProcessing
                ? 'bg-[#1e293b] text-[#6b7280] cursor-not-allowed'
                : 'bg-[#1e293b] text-white hover:bg-[#2a3441] active:bg-[#1a2533]'
            }`}
        >
          {isProcessing ? '⏳' : '📎'}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || isProcessing}
          placeholder={isProcessing ? '処理中...' : 'メッセージを入力...'}
          className="flex-1 px-3 py-2 sm:p-2 bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg
            placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]
            disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base
            min-h-[40px] sm:min-h-[44px]"
        />
        <button
          type="submit"
          disabled={disabled || (!input && !imagePreview) || isProcessing}
          className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base
            min-w-[64px] sm:min-w-[72px] min-h-[40px] sm:min-h-[44px]
            ${
              disabled || (!input && !imagePreview) || isProcessing
                ? 'bg-[#1e293b] text-[#6b7280] cursor-not-allowed'
                : 'bg-[#0ea5e9] text-white hover:bg-[#0284c7] active:bg-[#0369a1]'
            }`}
        >
          送信
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept=".txt,.md,.js,.ts,.jsx,.tsx,.json,.csv,.html,.css,image/*"
      />
    </form>
  );
};