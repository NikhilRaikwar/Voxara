---
name: LLM translation fallback
description: Why lyric translations come from an LLM instead of Musixmatch.
---

The Musixmatch plan in use does NOT provide working translations: `subtitle_translated`
returns the original text, and `lyrics.translation.get` returns 0 results for every probed
track. Do not waste time re-wiring Musixmatch translation — it is non-functional on this key.

**Decision:** `translate.ts` batch-translates lyric lines through the Replit-managed OpenAI
integration (`AI_INTEGRATIONS_OPENAI_*`). Primary model `gpt-5-mini` with
`reasoning_effort: "minimal"` (cuts an 88-line session from ~60s to ~13s); falls back to
`gpt-4.1-mini`.

**How to apply:** translation is best-effort — on failure it returns nulls and the session
reports `hasTranslation: false` rather than erroring. Response is forced to JSON
(`response_format: json_object`) and parsed with markdown-fence stripping.
