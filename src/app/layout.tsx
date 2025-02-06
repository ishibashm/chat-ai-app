import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ChatProvider } from '@/lib/chatContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Chat App',
  description: 'AI Chat Application',
  manifest: '/manifest.json',
  viewport: 'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover',
  themeColor: '#1a1a1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Chat App',
  },
  formatDetection: {
    telephone: false,
  },
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
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
