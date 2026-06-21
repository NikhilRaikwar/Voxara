import { Router, type IRouter } from "express";
import {
  GetFeaturedTracksResponse,
  SearchTracksResponse,
  GetTrackSessionResponse,
} from "@workspace/api-zod";
import {
  searchTracks as mxSearch,
  getTrack,
  getLyrics,
  getRichsync,
  getTranslatedSubtitles,
  getLyricsTranslation,
  type MxRichLine,
  type MxSubtitleLine,
} from "../lib/musixmatch";

const router: IRouter = Router();

// Hand-picked demo tracks confirmed to have rich, well-synced lyrics.
const FEATURED_QUERIES: { q_track: string; q_artist: string }[] = [
  { q_track: "Despacito", q_artist: "Luis Fonsi" },
  { q_track: "La Vie En Rose", q_artist: "Edith Piaf" },
  { q_track: "Bella Ciao", q_artist: "Manu Pilas" },
  { q_track: "Ai Se Eu Te Pego", q_artist: "Michel Telo" },
  { q_track: "99 Luftballons", q_artist: "Nena" },
  { q_track: "Volare", q_artist: "Domenico Modugno" },
];

router.get("/tracks/featured", async (req, res, next) => {
  try {
    const results = await Promise.all(
      FEATURED_QUERIES.map(async (q) => {
        const list = await mxSearch(q);
        return list[0] ?? null;
      }),
    );
    const tracks = results.filter((t): t is NonNullable<typeof t> => t !== null);
    res.json(GetFeaturedTracksResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const q_track =
      typeof req.query.q_track === "string" ? req.query.q_track : undefined;
    const q_artist =
      typeof req.query.q_artist === "string" ? req.query.q_artist : undefined;

    if (!q && !q_track && !q_artist) {
      res.status(400).json({ error: "A search query is required" });
      return;
    }

    const tracks = await mxSearch({ q, q_track, q_artist });
    res.json(SearchTracksResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

// Attach the best-matching translation to each richsync line by timestamp.
function attachTranslations(
  lines: MxRichLine[],
  subtitles: MxSubtitleLine[] | null,
): (string | null)[] {
  if (!subtitles || subtitles.length === 0) return lines.map(() => null);
  return lines.map((line) => {
    let best: MxSubtitleLine | null = null;
    let bestDiff = Infinity;
    for (const sub of subtitles) {
      const diff = Math.abs(sub.time - line.ts);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = sub;
      }
    }
    // Only accept a translation that lines up reasonably closely.
    return best && bestDiff <= 4 ? best.text : null;
  });
}

router.get("/tracks/session", async (req, res, next) => {
  try {
    const trackId = Number(req.query.trackId);
    if (!Number.isFinite(trackId)) {
      res.status(400).json({ error: "A valid trackId is required" });
      return;
    }
    const lang =
      typeof req.query.selected_language === "string"
        ? req.query.selected_language
        : "en";

    const track = await getTrack(trackId);
    if (!track) {
      res.status(404).json({ error: "Track not found" });
      return;
    }

    const [lyrics, richsync, subtitles] = await Promise.all([
      getLyrics(trackId),
      getRichsync(trackId),
      getTranslatedSubtitles(trackId, lang),
    ]);

    let lines: any[] = [];
    let hasRichsync = false;
    let hasTranslation = false;

    if (richsync && richsync.length > 0) {
      hasRichsync = true;
      const translations = attachTranslations(richsync, subtitles);
      hasTranslation = translations.some((t) => t !== null);
      lines = richsync.map((line, idx) => ({
        index: idx,
        ts: line.ts,
        te: line.te,
        text: line.text,
        words: line.words,
        translation: translations[idx],
      }));
    }

    // Fallback: no per-word timing; surface plain lyrics + best-effort translation.
    let plainLyrics: string | null = null;
    if (!hasRichsync) {
      plainLyrics = lyrics?.body ?? null;
      if (!hasTranslation) {
        const translated = await getLyricsTranslation(trackId, lang);
        if (translated) {
          hasTranslation = true;
          plainLyrics = plainLyrics
            ? `${plainLyrics}\n\n— — —\n\n${translated}`
            : translated;
        }
      }
    }

    const payload = {
      track,
      lines,
      plainLyrics,
      copyright: lyrics?.copyright ?? "",
      hasRichsync,
      hasTranslation,
      targetLanguage: lang,
    };

    res.json(GetTrackSessionResponse.parse(payload));
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
