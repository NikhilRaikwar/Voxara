# LinguaSync

A music-driven language & pronunciation tutor. Search a song, upload its audio, isolate the vocals, then learn the lyrics in **Listen mode** (word-synced highlighting + tap-to-translate) and rehearse them in **Practice mode** (record yourself, get word-by-word pronunciation grading), ending in a session recap.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `MUSIXMATCH_API_KEY`, `LALAL_API_KEY`, `ELEVENLABS_API_KEY`
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
- Provider clients: `artifacts/api-server/src/lib/` (`musixmatch.ts`, `lalal.ts`, `elevenlabs.ts`, `translate.ts`, `grading.ts`)
- Central error handler: `artifacts/api-server/src/app.ts`
- Frontend pages: `artifacts/web/src/pages/`; raw-fetch upload calls: `artifacts/web/src/lib/api-extra.ts`

## Architecture decisions

- **File-upload endpoints (`POST /isolation`, `POST /grade`) are NOT in the OpenAPI spec.** They are called via raw `fetch` + `FormData` from `api-extra.ts`. Putting multipart in the spec produced File/Blob codegen errors, and mixing path+query params on one op caused name collisions. All other endpoints are query-param-only and generate clean hooks.
- **Translation is done by an LLM, not Musixmatch.** The Musixmatch plan in use returns the original text for `subtitle_translated` and 0 results for `lyrics.translation.get`, so `translate.ts` batch-translates lyric lines via the OpenAI integration (`gpt-5-mini` with `reasoning_effort: minimal`, falling back to `gpt-4.1-mini`).
- **External account-limit errors map to 4xx, not 5xx.** The central handler masks all 5xx as a generic message. LALAL ("Premium license required") and ElevenLabs quota/auth failures are classified as `402` so their actionable message reaches the user via `api-extra.ts`.
- Generated react-query hooks require `queryKey` in the options object (TanStack v5 + Orval 8). Call sites pass the generated `getXQueryKey(...)` helper alongside `enabled`.

## Gotchas

- **LALAL vocal isolation requires a paid (Premium) LALAL plan.** The current key is free-tier: upload succeeds but the stem-split step returns "Premium license required to access this feature." This is an account limitation, not a bug — isolation will work once the LALAL account is upgraded.
- Verify artifacts with `pnpm --filter @workspace/<slug> run typecheck`, not `build` (build needs workflow-provided `PORT`/`BASE_PATH`).
- Do not change the OpenAPI `info.title` — it controls generated filenames.
- ElevenLabs STT model is `scribe_v1`; grade field names are `file`, `expected`, `language_code`. Isolation upload field is `file`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
