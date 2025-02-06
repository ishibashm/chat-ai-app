'use client';

import React from 'react';
import ChatHeader from './ChatHeader';
import { ChatContainer } from './ChatContainer';
import { ChatInput } from './ChatInput';
import { useChatContext } from '../lib/chatContext';
import { Message } from '@/types/chat';

export default function ChatLayout() {
  const { currentChatId, chats, updateChat } = useChatContext();

  const handleSendMessage = async (content: string) => {
    if (!currentChatId) return;

    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;

    const newMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now()
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, newMessage],
      updatedAt: Date.now()
    };

    updateChat(updatedChat);
  };

  return (
    <div className="h-screen flex flex-col">
      <ChatHeader />
      
      <div className="flex-1 bg-gray-900">
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <ChatContainer />
          </div>
        </div>
      </div>
    </div>
  );
}