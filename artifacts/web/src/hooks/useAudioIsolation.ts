import { useState, useCallback } from 'react';
import { uploadIsolation } from '../lib/api-extra';

// Isolation runs synchronously on the server (ElevenLabs Audio Isolation): one
// request returns the isolated vocal audio, so there is no job to poll. We model
// just three states — uploading (request in flight), done (vocalUrl ready), or
// error — while keeping the same shape the UI already consumes.
export function useAudioIsolation() {
  const [vocalUrl, setVocalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startIsolation = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      // Free any previously isolated blob before requesting a new one.
      setVocalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const res = await uploadIsolation(file);
      setVocalUrl(res.vocalUrl);
    } catch (e: any) {
      setError(e.message || 'Isolation failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setVocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setUploading(false);
    setError(null);
  }, []);

  const status = uploading
    ? 'processing'
    : error
      ? 'error'
      : vocalUrl
        ? 'success'
        : 'idle';

  return {
    startIsolation,
    reset,
    status,
    progress: 0,
    vocalUrl,
    error,
  };
}
