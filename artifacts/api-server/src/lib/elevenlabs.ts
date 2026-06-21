import { logger } from "./logger";

const URL = "https://api.elevenlabs.io/v1/speech-to-text";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError("ELEVENLABS_API_KEY is not configured", 500);
  return key.trim();
}

export interface ScribeWord {
  text: string;
  start: number;
  end: number;
}
export interface ScribeResult {
  transcript: string;
  words: ScribeWord[];
}

export async function transcribe(
  buffer: Buffer,
  filename: string,
  contentType: string,
  languageCode?: string,
): Promise<ScribeResult> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: contentType || "audio/webm",
  });
  form.append("file", blob, filename || "recording.webm");
  form.append("model_id", "scribe_v1");
  form.append("timestamps_granularity", "word");
  if (languageCode) form.append("language_code", languageCode);

  const res = await fetch(URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.warn({ status: res.status, detail }, "ElevenLabs STT failed");
    throw new ElevenLabsError(`ElevenLabs STT HTTP ${res.status}`, 502);
  }

  const body = (await res.json()) as any;
  const words: ScribeWord[] = (body.words ?? [])
    .filter((w: any) => w.type === "word" || w.type === undefined)
    .map((w: any) => ({
      text: String(w.text ?? "").trim(),
      start: Number(w.start ?? 0),
      end: Number(w.end ?? 0),
    }))
    .filter((w: ScribeWord) => w.text.length > 0);

  return {
    transcript: String(body.text ?? ""),
    words,
  };
}
