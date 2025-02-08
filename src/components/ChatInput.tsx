import React, { useState, useRef } from 'react';
import { ThreadInfo } from '@/types/chat';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  threadInfo?: ThreadInfo;
}

interface ImagePreview {
  url: string;
  name: string;
  ocrText?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled,
  threadInfo 
}) => {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imagePreview) && !disabled && !isProcessing) {
      let message = input.trim();
      if (imagePreview) {
        const imageMarkdown = `![${imagePreview.name}](${imagePreview.url})\n\n`;
        if (imagePreview.ocrText) {
          message = `${imageMarkdown}検出されたテキスト:\n${imagePreview.ocrText}\n\n${message}`;
        } else {
          message = `${imageMarkdown}${message}`;
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
      return data.text || '';
    } catch (error) {
      console.error('OCR error:', error);
      return '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const ocrText = await processImageWithOCR(base64);
          setImagePreview({ 
            url: base64, 
            name: file.name,
            ocrText: ocrText || undefined
          });
        };
        reader.readAsDataURL(file);
      } else {
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
      {threadInfo?.continuation?.fromId && (
        <div className="px-4 py-2 bg-[#1e293b] text-[#e2e8f0] rounded-lg text-sm">
          <span className="text-[#0ea5e9]">前のスレッドからの続き</span>
        </div>
      )}

      {imagePreview && (
        <div className="relative max-h-[300px] overflow-auto">
          <div className="relative group rounded-lg overflow-hidden border border-[#2a2a2a] max-w-[200px]">
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="w-full h-auto object-contain max-h-[150px]"
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
          {imagePreview.ocrText && (
            <div className="mt-2 p-2 bg-[#2a2a2a] rounded text-sm text-[#e2e8f0] max-w-[300px] max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="font-medium text-[#0ea5e9] mb-1">検出されたテキスト:</div>
              <div className="whitespace-pre-wrap">{imagePreview.ocrText}</div>
            </div>
          )}
        </div>
      )}

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
          placeholder={
            threadInfo?.continuation?.fromId
              ? '前のスレッドからの続きに返信...'
              : isProcessing 
                ? '処理中...' 
                : 'メッセージを入力...'
          }
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