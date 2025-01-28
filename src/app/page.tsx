'use client';

import { ChatContainer } from '../components/ChatContainer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a1a1a]">
      <div className="h-screen">
        <header className="bg-[#141414] border-b border-[#2a2a2a] px-4 py-3">
          <div className="container mx-auto">
            <h1 className="text-xl font-bold text-white">AI Chat App</h1>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 text-xs bg-[#0ea5e9] text-white rounded">GPT-4</span>
              <span className="px-2 py-0.5 text-xs bg-[#1e293b] text-[#e2e8f0] rounded">GPT-3.5</span>
              <span className="px-2 py-0.5 text-xs bg-[#1e293b] text-[#e2e8f0] rounded">Claude</span>
            </div>
          </div>
        </header>
        <div className="h-[calc(100vh-64px)]">
          <ChatContainer />
        </div>
      </div>
    </main>
  );
}
