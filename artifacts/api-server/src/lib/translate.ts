import { logger } from "./logger";

// Common language codes -> human names for clearer LLM prompting.
const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  pl: "Polish",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  el: "Greek",
  ru: "Russian",
  uk: "Ukrainian",
  tr: "Turkish",
  ar: "Arabic",
  he: "Hebrew",
  fa: "Persian",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  ur: "Urdu",
  id: "Indonesian",
  ms: "Malay",
  th: "Thai",
  vi: "Vietnamese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

export function languageName(code: string): string {
  return LANG_NAMES[code?.toLowerCase()] ?? code;
}

function baseUrl(): string | null {
  return process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? null;
}
function apiKey(): string | null {
  return process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? null;
}

export function translationAvailable(): boolean {
  return Boolean(baseUrl() && apiKey());
}

// Some models wrap JSON in ```json fences; strip them before parsing.
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

// Translate an array of lyric lines into the target language in a single call.
// Returns an array of the same length (null entries where translation wasn't produced).
export async function translateLines(
  lines: string[],
  targetLang: string,
): Promise<(string | null)[]> {
  const url = baseUrl();
  const key = apiKey();
  if (!url || !key || lines.length === 0) {
    return lines.map(() => null);
  }

  const target = languageName(targetLang);
  const numbered = lines.map((l, i) => `${i}\t${l}`).join("\n");

  const system =
    "You are a professional song-lyrics translator. Translate each numbered line into the requested target language. Preserve meaning and tone; keep it natural and singable, not word-for-word. Return ONLY a compact JSON object mapping the line index (as a string) to its translation. Do not include any commentary.";
  const user = `Target language: ${target}\n\nLines (index<TAB>text):\n${numbered}\n\nReturn JSON like {"0":"...","1":"..."} for every index.`;

  // Prefer the fast model, but fall back so a single unavailable model doesn't
  // silently disable the entire translation feature.
  for (const model of MODELS) {
    const parsed = await requestTranslation(url, key, model, system, user);
    if (parsed) {
      return lines.map((_, i) => {
        const v = parsed[String(i)];
        return typeof v === "string" && v.trim().length > 0 ? v : null;
      });
    }
  }

  logger.warn({ models: MODELS }, "All translation models failed");
  return lines.map(() => null);
}

// Translate an array of UI strings (buttons, labels, headings) into the target
// language in a single call. Unlike lyric translation, this prompt optimizes for
// short, natural interface copy and preserves {placeholders} and the brand name.
export async function translateUiStrings(
  texts: string[],
  targetLang: string,
): Promise<(string | null)[]> {
  const url = baseUrl();
  const key = apiKey();
  if (!url || !key || texts.length === 0) {
    return texts.map(() => null);
  }

  const target = languageName(targetLang);
  const numbered = texts.map((l, i) => `${i}\t${l}`).join("\n");

  const system =
    "You are a professional software UI localizer. Translate each numbered user-interface string into the requested target language. Keep translations concise and natural for buttons, labels, and headings. Preserve any placeholder wrapped in curly braces (e.g. {trackName}) exactly as-is. Keep the brand name 'Voxara' untranslated. Return ONLY a compact JSON object mapping the string index (as a string) to its translation. Do not include any commentary.";
  const user = `Target language: ${target}\n\nStrings (index<TAB>text):\n${numbered}\n\nReturn JSON like {"0":"...","1":"..."} for every index.`;

  for (const model of MODELS) {
    const parsed = await requestTranslation(url, key, model, system, user);
    if (parsed) {
      return texts.map((_, i) => {
        const v = parsed[String(i)];
        return typeof v === "string" && v.trim().length > 0 ? v : null;
      });
    }
  }

  logger.warn({ models: MODELS }, "All UI translation models failed");
  return texts.map(() => null);
}

// Ordered translation models; the first that succeeds wins.
const MODELS = ["gpt-5-mini", "gpt-4.1-mini"] as const;

async function requestTranslation(
  url: string,
  key: string,
  model: string,
  system: string,
  user: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        // gpt-5 models reason by default; keep latency low for translation.
        ...(model.startsWith("gpt-5")
          ? { reasoning_effort: "minimal" }
          : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.warn(
        { model, status: res.status, detail },
        "Translation request failed",
      );
      return null;
    }

    const body = (await res.json()) as any;
    const content = body?.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      return JSON.parse(stripFences(content)) as Record<string, unknown>;
    } catch {
      logger.warn(
        { model, sample: String(content).slice(0, 120) },
        "Translation response was not valid JSON",
      );
      return null;
    }
  } catch (err) {
    logger.warn({ model, err }, "Translation call threw");
    return null;
  }
}
