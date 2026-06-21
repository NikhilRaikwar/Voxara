---
name: express-rate-limit behind Replit proxy
description: Why express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on Replit and the correct fix.
---

Any Express app on Replit runs behind Replit's shared reverse proxy, so every
incoming request carries an `X-Forwarded-For` header. `express-rate-limit` (v8+)
validates that the app actually trusts the proxy before using XFF to identify the
client; if Express `trust proxy` is left at its default (`false`), it throws
`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` from its keyGenerator. This surfaced as the
**first** request to a rate-limited route failing — in the browser it looked like
a generic "failed to fetch" on the upload endpoint.

**Fix:** `app.set("trust proxy", 1)` — trust exactly one hop (the Replit proxy).

**Why not `true`:** `trust proxy = true` is permissive and lets clients spoof
their IP via a forged XFF, defeating per-IP rate limiting. Trust the specific
number of proxy hops instead (1 for Replit's single proxy layer).

**How to apply:** whenever adding `express-rate-limit` (or anything that reads the
client IP) to an Express artifact, set `trust proxy` to 1 in `app.ts` before the
middleware runs.
