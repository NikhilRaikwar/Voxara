---
name: Songstats integration
description: How LinguaSync resolves and uses Songstats popularity stats, and why trending uses Musixmatch instead.
---

# Songstats integration

Songstats provides cross-platform popularity stats (Spotify streams, Shazams, playlists, TikTok views) shown on track cards, plus the data behind the "Trending Now" section concept.

## Key access limits (this enterprise key)
- `tracks/search` and `tracks/stats` work; stats accept either `isrc` or `songstats_track_id`.
- **`charts/*` endpoints return 403** ("does not have access to charts endpoints"). So Songstats cannot supply a trending list on this key.

## Matching by name + artist (no ISRC path)
Musixmatch track objects on the current plan do not expose ISRC, so we cannot do a direct ID lookup. `/tracks/stats` chains `tracks/search?q="<title> <artist>"` → pick best artist match → `tracks/stats?songstats_track_id=...`. This is 2 outbound calls per track.

**Why:** ISRC-based lookup would halve calls and remove the fuzzy-match hop, but it isn't available from Musixmatch here.

## Trending source
`/tracks/trending` uses Musixmatch `chart.tracks.get` (top chart, `f_has_lyrics=1`), NOT Songstats (charts 403). Each trending/featured card then enriches popularity via the stats endpoint.

## Resilience decisions
- Stats are **non-critical enrichment**: any failure degrades to `{found:false}` (card simply hides the stats row) instead of surfacing an error.
- A Landing render fans out ~15 cards × 2 calls = ~30 concurrent Songstats calls, which trips bursty 429/5xx rate limits. Mitigations: retry 429/5xx with jittered backoff (3 attempts) in the client `call()`, plus a 10-minute in-memory stats cache keyed by lowercased `name|artist`.

**Why the cache is allowed:** the project's no-cache rule is specific to Musixmatch *lyrics* (their terms). Caching Songstats popularity numbers is fine and is the main lever against rate-limit cascades. Failures are NOT cached so the next request can retry.
