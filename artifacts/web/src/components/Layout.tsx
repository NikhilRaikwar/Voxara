import React, { ReactNode } from 'react';
import { Link } from 'wouter';
import { useSession } from '../store/SessionContext';

export function Layout({ children }: { children: ReactNode }) {
  const { targetLanguage, setTargetLanguage } = useSession();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
              L
            </div>
            <span className="font-semibold text-lg tracking-tight">LinguaSync</span>
          </Link>

          <div className="flex items-center gap-4">
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
