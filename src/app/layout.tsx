import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ChatProvider } from '@/lib/chatContext';
import ChatHeader from '@/components/ChatHeader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Chat App',
  description: 'AI Chat Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ChatProvider>
          <ChatHeader />
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
