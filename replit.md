# LinguaSync

A music-driven language & pronunciation tutor. Search a song, upload its audio, isolate the vocals, then learn the lyrics in **Listen mode** (word-synced highlighting + tap-to-translate) and rehearse them in **Practice mode** (record yourself, get word-by-word pronunciation grading), ending in a session recap.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `MUSIXMATCH_API_KEY`, `ELEVENLABS_API_KEY`, `SONGSTATS_API_KEY` (`ELEVENLABS_API_KEY` powers both vocal isolation and pronunciation grading)
- Translation uses the Replit-managed OpenAI integration: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, multer (in-memory file uploads)
- Frontend: React + Vite, wouter, TanStack Query, cream/terracotta theme
- Validation: Zod (`zod/v4`); API codegen: Orval (from OpenAPI spec)
- **No database** — Musixmatch terms prohibit caching lyrics, so all session state is client-side.

## Where things live

- API contract: `lib/api-spec/openapi.yaml` → generates `lib/api-client-react` (hooks) and `lib/api-zod` (schemas)
- Server routes: `artifacts/api-server/src/routes/` (`tracks.ts`, `isolation.ts`, `grade.ts`)
- Provider clients: `artifacts/api-server/src/lib/` (`musixmatch.ts`, `elevenlabs.ts` (isolation + STT), `translate.ts`, `grading.ts`, `songstats.ts`)
- Popularity stats UI: `artifacts/web/src/components/TrackCard.tsx` (lazy per-card stats); Trending section: `artifacts/web/src/pages/Landing.tsx`
- Central error handler: `artifacts/api-server/src/app.ts`
- Frontend pages: `artifacts/web/src/pages/`; raw-fetch upload calls: `artifacts/web/src/lib/api-extra.ts`

## Architecture decisions

- **File-upload endpoints (`POST /isolation`, `POST /grade`) are NOT in the OpenAPI spec.** They are called via raw `fetch` + `FormData` from `api-extra.ts`. Putting multipart in the spec produced File/Blob codegen errors, and mixing path+query params on one op caused name collisions. All other endpoints are query-param-only and generate clean hooks.
- **Translation is done by an LLM, not Musixmatch.** The Musixmatch plan in use returns the original text for `subtitle_translated` and 0 results for `lyrics.translation.get`, so `translate.ts` batch-translates lyric lines via the OpenAI integration (`gpt-5-mini` with `reasoning_effort: minimal`, falling back to `gpt-4.1-mini`).
- **Vocal isolation uses ElevenLabs Audio Isolation (`POST /v1/audio-isolation`), and is synchronous.** Unlike the old LALAL flow (upload→split→poll), ElevenLabs returns the isolated vocal bytes in one call. So `POST /api/isolation` runs isolation inline and streams the `audio/mpeg` result straight back; the frontend plays it from an in-memory `URL.createObjectURL` blob. There is no job id, no status endpoint, and no polling. (LALAL was removed because its free-tier key cannot do stem splits.)
- **External account-limit errors map to 4xx, not 5xx.** The central handler masks all 5xx as a generic message. ElevenLabs quota/auth failures (401/402/403/429) are classified as `402` so their actionable message reaches the user via `api-extra.ts`.
- Generated react-query hooks require `queryKey` in the options object (TanStack v5 + Orval 8). Call sites pass the generated `getXQueryKey(...)` helper alongside `enabled`.
- **Popularity stats come from Songstats, matched by track name + artist.** `GET /tracks/stats` chains Songstats `tracks/search` → `tracks/stats` (this key has no ISRC on Musixmatch tracks). Stats are non-critical enrichment: failures degrade to `{found:false}` (hidden on the card) rather than erroring. `songstats.ts` retries 429/5xx with backoff and caches results in-memory (10 min) — this caches popularity stats only, never Musixmatch lyrics, so the no-cache rule is unaffected.
- **Trending uses Musixmatch `chart.tracks.get`, not Songstats.** Songstats charts endpoints return 403 on this key, so `GET /tracks/trending` returns the Musixmatch top chart; each card then enriches via the stats endpoint.

## Gotchas

- **ElevenLabs Audio Isolation rejects clips shorter than ~4.6 seconds** (`audio_too_short`) and consumes ElevenLabs credits per call. Isolation runs synchronously and can take up to ~a minute for a full song — keep the request timeout generous and show a loading state.
- Verify artifacts with `pnpm --filter @workspace/<slug> run typecheck`, not `build` (build needs workflow-provided `PORT`/`BASE_PATH`).
- Do not change the OpenAPI `info.title` — it controls generated filenames.
- ElevenLabs STT model is `scribe_v1`; grade field names are `file`, `expected`, `language_code`. Our `/api/isolation` upload field is `file`, but the ElevenLabs Audio Isolation API itself expects the multipart field name `audio`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
