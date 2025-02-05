'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import { useChatContext } from '@/lib/chatContext';

export default function ChatPage() {
  const { chatId } = useParams();
  const { setCurrentChatId } = useChatContext();

  useEffect(() => {
    if (typeof chatId === 'string') {
      setCurrentChatId(chatId);
    }
  }, [chatId, setCurrentChatId]);

  return <ChatLayout />;
}