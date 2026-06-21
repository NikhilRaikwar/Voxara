import { useState, useCallback, useEffect } from 'react';
import { useGetIsolationStatus, getGetIsolationStatusQueryKey } from '@workspace/api-client-react';
import { uploadIsolation } from '../lib/api-extra';

export function useAudioIsolation() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: statusData, isError, error: pollError } = useGetIsolationStatus(
    { taskId: taskId! },
    { 
      query: { 
        enabled: !!taskId, 
        queryKey: getGetIsolationStatusQueryKey({ taskId: taskId! }),
        refetchInterval: (query) => {
          if (!query.state.data) return 2500;
          const status = query.state.data.status;
          return (status === 'processing' || status === undefined) ? 2500 : false;
        }
      } 
    }
  );

  const startIsolation = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setTaskId(null);
      const res = await uploadIsolation(file);
      setTaskId(res.taskId);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTaskId(null);
    setUploading(false);
    setError(null);
  }, []);

  let currentStatus = 'idle';
  let progress = 0;
  let vocalUrl: string | null = null;

  if (uploading) {
    currentStatus = 'uploading';
  } else if (taskId && statusData) {
    currentStatus = statusData.status;
    progress = statusData.progress || 0;
    vocalUrl = statusData.vocalUrl || null;
    if (statusData.error) {
      currentStatus = 'error';
    }
  } else if (taskId && !statusData) {
    currentStatus = 'processing'; // initial poll
  }

  const pollErrorMessage =
    pollError instanceof Error
      ? pollError.message
      : pollError
        ? String(pollError)
        : null;
  const activeError =
    error || statusData?.error || (isError ? pollErrorMessage : null);

  return {
    startIsolation,
    reset,
    status: currentStatus,
    progress,
    vocalUrl,
    error: activeError,
    taskId,
  };
}
