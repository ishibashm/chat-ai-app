'use client';

import React from 'react';
import ChatHeader from './ChatHeader';
import { ChatContainer } from './ChatContainer';
import { ChatInput } from './ChatInput';
import { useChatContext } from '../lib/chatContext';

export default function ChatLayout() {
  const { currentChatId } = useChatContext();

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