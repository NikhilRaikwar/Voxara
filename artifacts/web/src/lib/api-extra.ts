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

// Isolation is synchronous: the server returns the isolated vocal audio bytes
// directly. We wrap them in an object URL the <audio> element can play.
export async function uploadIsolation(file: File): Promise<{ vocalUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${import.meta.env.BASE_URL}api/isolation`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Upload failed'));
  const blob = await res.blob();
  return { vocalUrl: URL.createObjectURL(blob) };
}

// Translate a bundle of UI strings into the target language in one call.
// Kept out of the OpenAPI spec (raw fetch) like the upload endpoints, since an
// array request/response body causes codegen friction.
export async function translateUiBundle(
  texts: string[],
  language: string,
): Promise<(string | null)[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, language }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Translation failed'));
  const data = (await res.json()) as { translations: (string | null)[] };
  return data.translations;
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
