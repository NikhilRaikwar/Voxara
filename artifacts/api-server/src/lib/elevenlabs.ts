import { logger } from "./logger";

const URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ISOLATION_URL = "https://api.elevenlabs.io/v1/audio-isolation";

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
    // Account/quota/auth problems are not our fault — surface them (4xx) so the
    // message reaches the user instead of being masked by the generic handler.
    if ([401, 402, 403, 429].includes(res.status)) {
      throw new ElevenLabsError(
        "Speech grading is unavailable: the ElevenLabs account rejected the request (check the API key, plan or quota).",
        402,
      );
    }
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

export interface IsolatedAudio {
  audio: Buffer;
  contentType: string;
}

// Extract the vocal stem from a mixed track. ElevenLabs Audio Isolation is
// synchronous: it returns the processed audio bytes in a single call (no job
// polling), so the caller can stream the result straight back to the browser.
export async function isolateVocals(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<IsolatedAudio> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: contentType || "audio/mpeg",
  });
  form.append("audio", blob, filename || "track.mp3");

  const res = await fetch(ISOLATION_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.warn(
      { status: res.status, detail },
      "ElevenLabs audio isolation failed",
    );
    // Account/quota/auth problems are not our fault — surface them (4xx) so the
    // message reaches the user instead of being masked by the generic handler.
    if ([401, 402, 403, 429].includes(res.status)) {
      throw new ElevenLabsError(
        "Vocal isolation is unavailable: the ElevenLabs account rejected the request (check the API key, plan or quota).",
        402,
      );
    }
    if (res.status === 400 && detail.includes("audio_too_short")) {
      throw new ElevenLabsError(
        "That audio clip is too short to isolate — please upload the full song (at least ~5 seconds).",
        400,
      );
    }
    throw new ElevenLabsError(
      `ElevenLabs audio isolation HTTP ${res.status}`,
      502,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    audio: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type") || "audio/mpeg",
  };
}
