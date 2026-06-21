import { logger } from "./logger";

const BASE = "https://api.songstats.com/enterprise/v1";

export class SongstatsError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SongstatsError";
  }
}

function apiKey(): string {
  const key = process.env.SONGSTATS_API_KEY;
  if (!key) {
    throw new SongstatsError("SONGSTATS_API_KEY is not configured", 500);
  }
  return key.trim();
}

export function songstatsAvailable(): boolean {
  return Boolean(process.env.SONGSTATS_API_KEY);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<any> {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  // Songstats rate-limits bursts (many cards request stats at once), so retry
  // transient 429/5xx responses with a short backoff before giving up.
  const maxAttempts = 3;
  let lastMessage = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: { apikey: apiKey(), Accept: "application/json" },
    });
    const body = (await res.json().catch(() => null)) as any;
    if (res.ok && body?.result !== "error") return body;

    lastMessage = body?.message || `Songstats ${endpoint} HTTP ${res.status}`;
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < maxAttempts) {
      await sleep(250 * attempt + Math.floor(Math.random() * 150));
      continue;
    }
    logger.warn(
      { endpoint, status: res.status, message: lastMessage },
      "Songstats error",
    );
    throw new SongstatsError(lastMessage, 502);
  }
  throw new SongstatsError(lastMessage || "Songstats request failed", 502);
}

interface SongstatsSearchResult {
  songstatsTrackId: string;
  title: string;
  artists: string[];
  siteUrl: string | null;
}

async function searchTrack(
  trackName: string,
  artistName: string,
): Promise<SongstatsSearchResult | null> {
  const q = `${trackName} ${artistName}`.trim();
  const body = await call("tracks/search", { q, limit: 10 });
  const results: any[] = body?.results ?? [];
  if (results.length === 0) return null;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const wantArtist = normalize(artistName);

  // Prefer a result whose artist list matches; otherwise fall back to the top hit.
  const best =
    results.find((r) =>
      (r.artists ?? []).some((a: any) => {
        const name = normalize(a?.name ?? "");
        return (
          wantArtist.length > 0 &&
          (name.includes(wantArtist) || wantArtist.includes(name))
        );
      }),
    ) ?? results[0];

  return {
    songstatsTrackId: best.songstats_track_id,
    title: best.title,
    artists: (best.artists ?? []).map((a: any) => a?.name).filter(Boolean),
    siteUrl: best.site_url ?? null,
  };
}

export interface TrackStats {
  found: boolean;
  spotifyStreams: number | null;
  spotifyPopularity: number | null;
  playlists: number | null;
  shazams: number | null;
  tiktokViews: number | null;
  songstatsUrl: string | null;
}

const EMPTY_STATS: TrackStats = {
  found: false,
  spotifyStreams: null,
  spotifyPopularity: null,
  playlists: null,
  shazams: null,
  tiktokViews: null,
  songstatsUrl: null,
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Short-TTL in-memory cache to collapse repeated stat lookups (same tracks
// appear across featured/trending and across page reloads), which dramatically
// reduces Songstats fan-out and rate-limit pressure. This caches popularity
// stats only — never Musixmatch lyrics — so it does not affect lyric handling.
const STATS_TTL_MS = 1000 * 60 * 10;
const statsCache = new Map<string, { value: TrackStats; expires: number }>();

export async function getTrackStats(
  trackName: string,
  artistName: string,
): Promise<TrackStats> {
  const cacheKey = `${trackName.toLowerCase()}|${artistName.toLowerCase()}`;
  const cached = statsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  // Stats are non-critical card enrichment. Songstats can rate-limit when many
  // cards request stats at once, so any failure degrades gracefully to "not
  // found" rather than surfacing an error to the user.
  let result: TrackStats;
  try {
    const match = await searchTrack(trackName, artistName);
    if (match) {
      const body = await call("tracks/stats", {
        songstats_track_id: match.songstatsTrackId,
      });
      const stats: any[] = body?.stats ?? [];
      const bySource: Record<string, any> = {};
      for (const s of stats) {
        if (s?.source) bySource[s.source] = s.data ?? {};
      }

      const spotify = bySource.spotify ?? {};
      const shazam = bySource.shazam ?? {};
      const tiktok = bySource.tiktok ?? {};

      result = {
        found: true,
        spotifyStreams: num(spotify.streams_total),
        spotifyPopularity: num(spotify.popularity_current),
        playlists: num(spotify.playlists_current),
        shazams: num(shazam.shazams_total),
        tiktokViews: num(tiktok.views_total),
        songstatsUrl: match.siteUrl,
      };
    } else {
      result = { ...EMPTY_STATS };
    }
  } catch (err) {
    // Don't cache failures — let the next request retry rather than locking in
    // an empty result for the full TTL.
    logger.warn(
      { trackName, artistName, err: (err as Error).message },
      "Songstats stats lookup failed; returning empty stats",
    );
    return { ...EMPTY_STATS };
  }

  statsCache.set(cacheKey, {
    value: result,
    expires: Date.now() + STATS_TTL_MS,
  });
  return result;
}

export interface TrackVelocity {
  found: boolean;
  // A breakout/growth score. Higher = more current momentum relative to the
  // track's accumulated footprint. Used to re-rank chart entries.
  score: number;
}

const n = (v: unknown): number => num(v) ?? 0;

// Share of a footprint that is *currently active* (0..1). A high ratio means a
// track's reach is fresh/growing rather than a long-tail legacy total.
function freshness(current: unknown, total: unknown): number {
  const c = n(current);
  const t = n(total);
  return t > 0 ? Math.min(c / t, 1) : 0;
}

const velocityCache = new Map<
  string,
  { value: TrackVelocity; expires: number }
>();
// In-flight de-duplication: the same track can appear concurrently (parallel
// breakout requests, or the same hot track across requests before the cache
// fills). Sharing one in-flight promise per key collapses a cold-cache stampede
// into a single Songstats round-trip instead of N identical paid lookups.
const velocityInflight = new Map<string, Promise<TrackVelocity>>();

// Derive a "breakout velocity" signal from Songstats. The key exposes
// `_current` (active) and `_total` (cumulative) counters plus live chart
// presence per platform; a track currently sitting on many charts with a high
// share of *fresh* (editorial) playlist reach is breaking out, regardless of
// its raw Musixmatch chart rank.
export async function getTrackVelocity(
  trackName: string,
  artistName: string,
): Promise<TrackVelocity> {
  const cacheKey = `${trackName.toLowerCase()}|${artistName.toLowerCase()}`;
  const cached = velocityCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const pending = velocityInflight.get(cacheKey);
  if (pending) return pending;

  const work = computeTrackVelocity(trackName, artistName, cacheKey);
  velocityInflight.set(cacheKey, work);
  try {
    return await work;
  } finally {
    velocityInflight.delete(cacheKey);
  }
}

async function computeTrackVelocity(
  trackName: string,
  artistName: string,
  cacheKey: string,
): Promise<TrackVelocity> {
  let result: TrackVelocity;
  try {
    const match = await searchTrack(trackName, artistName);
    if (!match) {
      result = { found: false, score: 0 };
    } else {
      const body = await call("tracks/stats", {
        songstats_track_id: match.songstatsTrackId,
      });
      const stats: any[] = body?.stats ?? [];
      const bySource: Record<string, any> = {};
      for (const s of stats) {
        if (s?.source) bySource[s.source] = s.data ?? {};
      }
      const spotify = bySource.spotify ?? {};
      const shazam = bySource.shazam ?? {};
      const tiktok = bySource.tiktok ?? {};
      const apple = bySource.apple_music ?? {};

      const score =
        n(shazam.charts_current) * 4 + // Shazam = discovery/breakout signal
        n(spotify.charts_current) * 3 +
        n(apple.charts_current) * 2 +
        n(tiktok.charts_current) * 2 +
        freshness(
          spotify.playlists_editorial_current,
          spotify.playlists_editorial_total,
        ) *
          25 +
        freshness(spotify.playlists_current, spotify.playlists_total) * 15 +
        n(spotify.popularity_current) * 0.2;

      result = { found: true, score: Math.round(score * 100) / 100 };
    }
  } catch (err) {
    logger.warn(
      { trackName, artistName, err: (err as Error).message },
      "Songstats velocity lookup failed; treating as no velocity",
    );
    return { found: false, score: 0 };
  }

  velocityCache.set(cacheKey, {
    value: result,
    expires: Date.now() + STATS_TTL_MS,
  });
  return result;
}
