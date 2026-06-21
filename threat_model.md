# Threat Model

## Project Overview

Voxara is a public music-learning web application with a React frontend and an Express API server. Production-relevant behavior is concentrated in a small set of unauthenticated API routes that fetch track metadata and lyrics from Musixmatch, popularity data from Songstats, translations from a Replit-managed OpenAI-compatible endpoint, and audio-processing results from ElevenLabs. There is no database and no persistent server-side user state.

## Assets

- **Third-party API secrets and quota** — Musixmatch, ElevenLabs, Songstats, and OpenAI credentials are held server-side. Their compromise or abusive use would let an attacker spend credits, exhaust quota, or impersonate the service to those providers.
- **Service availability** — the API performs synchronous network calls and accepts audio uploads into memory. Resource exhaustion can directly degrade or crash the production service.
- **User-submitted audio and transcripts** — uploaded recordings and song audio are transient but still sensitive user content while in flight and in logs/errors.
- **Lyrics/session payloads** — session responses include lyric timing and translations that must only disclose the intended response body, not internal errors or provider details.

## Trust Boundaries

- **Browser to API** — all request parameters, multipart bodies, filenames, and language selections are untrusted.
- **API to external providers** — the server spends privileged API keys and provider quota on behalf of any caller.
- **Process memory to request handlers** — uploads are buffered in-process via multer memory storage, so untrusted client input directly consumes server RAM.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox/` is a development-only preview surface and should be excluded unless proven production-reachable.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`
- Highest-risk areas: `artifacts/api-server/src/routes/isolation.ts`, `artifacts/api-server/src/routes/grade.ts`, `artifacts/api-server/src/routes/tracks.ts`, `artifacts/api-server/src/lib/elevenlabs.ts`, `artifacts/api-server/src/lib/translate.ts`
- Public surfaces: all `/api/*` routes are unauthenticated; there is no admin surface and no database-backed user boundary
- Dev-only area to ignore unless proven reachable: `artifacts/mockup-sandbox/`

## Threat Categories

### Spoofing

This project does not rely on end-user authentication, so the primary spoofing risk is misuse of server-held provider identity. Requests crossing from the public internet into the API must never be able to act as arbitrary upstream calls beyond the specific, intended provider operations.

### Tampering

All query parameters, filenames, MIME types, expected lyric text, and language selections are attacker-controlled. The API must validate and constrain these values before they influence expensive provider calls or memory consumption.

### Information Disclosure

The service handles transient user audio, transcripts, and provider responses. Errors and logs must not expose secrets, raw authorization headers, cookies, or unnecessary provider internals back to clients or logs.

### Denial of Service

This is the dominant risk for the project. Public endpoints trigger synchronous third-party work, accept large multipart uploads, and buffer files in memory. Production must prevent anonymous callers from exhausting RAM, worker capacity, or paid provider quota through repeated requests or oversized parallel uploads.

### Elevation of Privilege

There is no role system, but the API still holds privileged capabilities that ordinary internet users should not be able to abuse arbitrarily. Public callers must not be able to turn the backend into an unlimited proxy for paid translation, speech-to-text, or audio-isolation services.
