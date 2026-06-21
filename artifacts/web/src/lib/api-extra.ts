import { GradingResult } from "@workspace/api-client-react";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Body wasn't JSON; fall through to the generic message.
  }
  return fallback;
}

export async function uploadIsolation(file: File): Promise<{ taskId: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${import.meta.env.BASE_URL}api/isolation`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Upload failed'));
  return res.json();
}

export async function gradeRecording(file: Blob, expected: string, languageCode?: string): Promise<GradingResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('expected', expected);
  if (languageCode) formData.append('language_code', languageCode);
  
  const res = await fetch(`${import.meta.env.BASE_URL}api/grade`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Grading failed'));
  return res.json();
}
