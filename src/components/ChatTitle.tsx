import React, { useState, useEffect, useRef } from 'react';

interface ChatTitleProps {
  title: string;
  isActive: boolean;
  hasChildren?: boolean;
  onUpdate: (newTitle: string) => void;
  onSelect: () => void;
  onDelete: (deleteChildren: boolean) => void;
}

export const ChatTitle: React.FC<ChatTitleProps> = ({
  title,
  isActive,
  hasChildren = false,
  onUpdate,
  onSelect,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(title);
    }
  };

  const handleSubmit = () => {
    if (editedTitle.trim()) {
      onUpdate(editedTitle.trim());
    } else {
      setEditedTitle(title);
    }
    setIsEditing(false);
  };

  const handleBlur = () => {
    handleSubmit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setShowDeleteConfirm(true);
    } else {
      onDelete(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        className={`w-full px-4 py-2 text-left rounded-lg transition-colors ${
          isActive
            ? 'bg-[#1e293b] text-white'
            : 'text-[#a0a0a0] hover:bg-[#1e293b]'
        }`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-[#1a1a1a] text-white px-2 py-1 rounded border border-[#2a2a2a] focus:outline-none focus:border-[#0ea5e9]"
          />
        ) : (
          <>
            <div className="truncate">{title}</div>
            <div className="text-xs text-[#666] truncate">
              ダブルクリックで編集
            </div>
          </>
        )}
      </button>

      {/* 削除ボタン */}
      {!isEditing && (
        <button
          onClick={handleDelete}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="absolute z-10 top-0 left-0 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 shadow-lg">
          <p className="text-sm text-white mb-4">
            このチャットには関連するチャットが存在します。すべて削除しますか？
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                onDelete(true);
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
            >
              すべて削除
            </button>
            <button
              onClick={() => {
                onDelete(false);
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1 bg-[#1e293b] text-white rounded-lg text-sm hover:bg-[#2a3b4d]"
            >
              このチャットのみ削除
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#3a3a3a]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};