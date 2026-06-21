import { logger } from "./logger";

const BASE = "https://api.musixmatch.com/ws/1.1";

export class MusixmatchError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "MusixmatchError";
  }
}

function apiKey(): string {
  const key = process.env.MUSIXMATCH_API_KEY;
  if (!key) {
    throw new MusixmatchError("MUSIXMATCH_API_KEY is not configured", 500);
  }
  return key.trim();
}

async function call(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<any> {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apikey", apiKey());
  url.searchParams.set("format", "json");

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new MusixmatchError(
      `Musixmatch ${endpoint} HTTP ${res.status}`,
      502,
    );
  }
  const body = (await res.json()) as any;
  const status = body?.message?.header?.status_code;
  if (status !== 200) {
    // 404 = not found for the requested asset; bubble up as recoverable.
    if (status === 404) {
      return null;
    }
    logger.warn({ endpoint, status }, "Musixmatch non-200 status");
    throw new MusixmatchError(
      `Musixmatch ${endpoint} status ${status}`,
      status === 401 || status === 402 || status === 403 ? 502 : 502,
    );
  }
  return body.message.body;
}

export interface MxTrack {
  trackId: number;
  commontrackId: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  albumCoverUrl: string | null;
  hasLyrics: boolean;
  hasRichsync: boolean;
  hasTranslation: boolean;
}

function pickCover(t: any): string | null {
  return (
    t.album_coverart_500x500 ||
    t.album_coverart_350x350 ||
    t.album_coverart_100x100 ||
    null
  );
}

function mapTrack(t: any): MxTrack {
  return {
    trackId: t.track_id,
    commontrackId: t.commontrack_id,
    trackName: t.track_name,
    artistName: t.artist_name,
    albumName: t.album_name || null,
    albumCoverUrl: pickCover(t),
    hasLyrics: t.has_lyrics === 1,
    hasRichsync: t.has_richsync === 1,
    hasTranslation: t.has_subtitles === 1 || t.has_richsync === 1,
  };
}

export async function searchTracks(opts: {
  q?: string;
  q_track?: string;
  q_artist?: string;
}): Promise<MxTrack[]> {
  const params: Record<string, string | number | undefined> = {
    page_size: 12,
    page: 1,
    s_track_rating: "desc",
    f_has_lyrics: 1,
  };
  if (opts.q) params.q = opts.q;
  if (opts.q_track) params.q_track = opts.q_track;
  if (opts.q_artist) params.q_artist = opts.q_artist;

  const body = await call("track.search", params);
  const list: any[] = body?.track_list ?? [];
  return list.map((entry) => mapTrack(entry.track));
}

export async function getTrack(trackId: number): Promise<MxTrack | null> {
  const body = await call("track.get", { track_id: trackId });
  if (!body?.track) return null;
  return mapTrack(body.track);
}

export interface MxLyrics {
  body: string;
  copyright: string;
}

export async function getLyrics(trackId: number): Promise<MxLyrics | null> {
  const body = await call("track.lyrics.get", { track_id: trackId });
  const lyrics = body?.lyrics;
  if (!lyrics || !lyrics.lyrics_body) return null;
  return {
    body: lyrics.lyrics_body as string,
    copyright: (lyrics.lyrics_copyright as string) || "",
  };
}

export interface MxRichWord {
  text: string;
  start: number;
  end: number;
}
export interface MxRichLine {
  ts: number;
  te: number;
  text: string;
  words: MxRichWord[];
}

export async function getRichsync(
  trackId: number,
): Promise<MxRichLine[] | null> {
  const body = await call("track.richsync.get", { track_id: trackId });
  const raw = body?.richsync?.richsync_body;
  if (!raw) return null;
  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parsed.map((line: any) => {
    const ts = Number(line.ts);
    const te = Number(line.te);
    const words: MxRichWord[] = (line.l ?? []).map(
      (w: any, idx: number, arr: any[]) => {
        const start = ts + Number(w.o);
        const nextOffset =
          idx + 1 < arr.length ? Number(arr[idx + 1].o) : te - ts;
        const end = ts + nextOffset;
        return {
          text: String(w.c),
          start,
          end: Math.max(end, start),
        };
      },
    );
    return { ts, te, text: String(line.x ?? ""), words };
  });
}

export interface MxSubtitleLine {
  text: string;
  time: number;
}

// Subtitles in the requested language act as our line-level translation source.
export async function getTranslatedSubtitles(
  trackId: number,
  lang: string,
): Promise<MxSubtitleLine[] | null> {
  const body = await call("track.subtitle.get", {
    track_id: trackId,
    subtitle_format: "lrc",
    subtitle_translated: lang,
  });
  const raw = body?.subtitle?.subtitle_body;
  if (!raw) return null;
  return parseLrc(raw);
}

function parseLrc(lrc: string): MxSubtitleLine[] {
  const lines: MxSubtitleLine[] = [];
  for (const row of lrc.split(/\r?\n/)) {
    const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const text = m[3].trim();
    lines.push({ time: min * 60 + sec, text });
  }
  return lines;
}

// Plain translation of full lyrics, used as a fallback when subtitles aren't available.
export async function getLyricsTranslation(
  trackId: number,
  lang: string,
): Promise<string | null> {
  const body = await call("track.lyrics.translation.get", {
    track_id: trackId,
    selected_language: lang,
  });
  const list = body?.translations_list;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list
    .map((t: any) => t.translation?.description)
    .filter(Boolean)
    .join("\n");
}
