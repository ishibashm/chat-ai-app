import React from 'react';
import { ChatProvider } from '../lib/chatContext';
import ChatLayout from './ChatLayout';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ChatProvider>
      <ChatLayout />
      {children}
    </ChatProvider>
  );
}