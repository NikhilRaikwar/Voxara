---
name: External provider error masking
description: Why some external-API failures must be thrown as 4xx, not 5xx.
---

The api-server central error handler (`artifacts/api-server/src/app.ts`) intentionally
replaces the body of any `statusCode >= 500` with a generic "Something went wrong on our end".

**Consequence:** if a provider client throws a 502 for an *account/plan/quota* failure, the
actionable upstream message (e.g. LALAL "Premium license required", ElevenLabs quota/auth) is
masked and never reaches the frontend.

**Rule:** classify expected account-limit / auth / quota provider failures as **4xx** (we use
`402`) so their message passes through. Keep genuine upstream faults (timeouts, 5xx, parse
errors) as `502`.

**How to apply:** see `classifyLalalError` in `lalal.ts` and the 401/402/403/429 branch in
`elevenlabs.ts`. The frontend (`api-extra.ts`) reads `{ error }` from the JSON body, so a 4xx
with a real message is what surfaces to the user.
