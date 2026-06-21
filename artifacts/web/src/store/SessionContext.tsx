import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Track } from '@workspace/api-client-react';

interface Attempt {
  lineIndex: number;
  scorePercent: number;
}

interface SessionContextType {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  vocalUrl: string | null;
  setVocalUrl: (url: string | null) => void;
  attempts: Attempt[];
  addAttempt: (lineIndex: number, scorePercent: number) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [vocalUrl, setVocalUrl] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const addAttempt = useCallback((lineIndex: number, scorePercent: number) => {
    setAttempts((prev) => [...prev, { lineIndex, scorePercent }]);
  }, []);

  const clearSession = useCallback(() => {
    setCurrentTrack(null);
    setVocalUrl(null);
    setAttempts([]);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        targetLanguage,
        setTargetLanguage,
        currentTrack,
        setCurrentTrack,
        vocalUrl,
        setVocalUrl,
        attempts,
        addAttempt,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
