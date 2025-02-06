import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 sm:p-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
        placeholder="メッセージを入力..."
        className="flex-1 px-3 py-2 sm:p-2 bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg
          placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]
          disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base
          min-h-[40px] sm:min-h-[44px]"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base
          min-w-[64px] sm:min-w-[72px] min-h-[40px] sm:min-h-[44px]
          ${
            disabled || !input.trim()
              ? 'bg-[#1e293b] text-[#6b7280] cursor-not-allowed'
              : 'bg-[#0ea5e9] text-white hover:bg-[#0284c7] active:bg-[#0369a1]'
          }`}
      >
        送信
      </button>
    </form>
  );
};