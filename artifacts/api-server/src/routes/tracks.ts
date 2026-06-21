import { Router, type IRouter } from "express";
import {
  GetFeaturedTracksResponse,
  SearchTracksResponse,
  IdentifyTrackResponse,
  GetTrackSessionResponse,
  GetTrendingTracksResponse,
  GetBreakoutTracksResponse,
  GetTrackStatsResponse,
} from "@workspace/api-zod";
import {
  searchTracks as mxSearch,
  identifyByLyric,
  discoverByMood,
  MOODS,
  getTrack,
  getLyrics,
  getRichsync,
  getSubtitles,
  getChartTracks,
} from "../lib/musixmatch";
import { getTrackStats, getTrackVelocity } from "../lib/songstats";
import { translateLines, translationAvailable } from "../lib/translate";
import {
  sessionLimiter,
  tracksLimiter,
  breakoutLimiter,
} from "../middlewares/rateLimiter";

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

router.get("/tracks/featured", tracksLimiter, async (req, res, next) => {
  try {
    const results = await Promise.all(
      FEATURED_QUERIES.map(async (q) => {
        const list = await mxSearch(q);
        return list[0] ?? null;
      }),
    );
    const tracks = results.filter(
      (t): t is NonNullable<typeof t> => t !== null,
    );
    res.json(GetFeaturedTracksResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/search", tracksLimiter, async (req, res, next) => {
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

router.get("/tracks/identify", tracksLimiter, async (req, res, next) => {
  try {
    const lyric =
      typeof req.query.lyric === "string" ? req.query.lyric.trim() : "";
    // Require a meaningful snippet: too short matches everything and wastes a
    // provider call; cap the length to keep the upstream query bounded.
    if (lyric.length < 3) {
      res
        .status(400)
        .json({
          error: "Enter at least a few words of the lyric you remember",
        });
      return;
    }
    const tracks = await identifyByLyric(lyric.slice(0, 200));
    res.json(IdentifyTrackResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/discover", tracksLimiter, async (req, res, next) => {
  try {
    const mood = typeof req.query.mood === "string" ? req.query.mood : "";
    if (!MOODS.includes(mood)) {
      res.status(400).json({
        error: `Unknown mood. Choose one of: ${MOODS.join(", ")}`,
      });
      return;
    }
    const tracks = await discoverByMood(mood);
    res.json(IdentifyTrackResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/breakout", breakoutLimiter, async (req, res, next) => {
  try {
    const tracks = await getChartTracks();
    // Enrich each chart entry with a Songstats velocity score, then re-rank by
    // momentum rather than raw chart position. Velocity is non-critical
    // enrichment: a failed lookup degrades to score 0 (sinks to the bottom)
    // rather than failing the whole panel.
    const ranked = await Promise.all(
      tracks.map(async (track) => {
        const velocity = await getTrackVelocity(
          track.trackName,
          track.artistName,
        );
        return { ...track, velocityScore: velocity.found ? velocity.score : 0 };
      }),
    );
    ranked.sort((a, b) => b.velocityScore - a.velocityScore);
    res.json(GetBreakoutTracksResponse.parse(ranked));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/trending", tracksLimiter, async (req, res, next) => {
  try {
    const tracks = await getChartTracks();
    res.json(GetTrendingTracksResponse.parse(tracks));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/stats", tracksLimiter, async (req, res, next) => {
  try {
    const trackName =
      typeof req.query.trackName === "string" ? req.query.trackName : "";
    const artistName =
      typeof req.query.artistName === "string" ? req.query.artistName : "";
    if (!trackName || !artistName) {
      res.status(400).json({ error: "trackName and artistName are required" });
      return;
    }
    const stats = await getTrackStats(trackName, artistName);
    res.json(GetTrackStatsResponse.parse(stats));
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/tracks/session", sessionLimiter, async (req, res, next) => {
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

    const [lyrics, richsync] = await Promise.all([
      getLyrics(trackId),
      getRichsync(trackId),
    ]);

    let lines: any[] = [];
    let syncLevel: "word" | "line" | "none" = "none";
    let hasTranslation = false;

    if (richsync && richsync.length > 0) {
      syncLevel = "word";
      // Musixmatch translations are unavailable on this plan, so we translate
      // the synced lines on demand into the learner's target language.
      const translations = await translateLines(
        richsync.map((l) => l.text),
        lang,
      );
      hasTranslation = translations.some((t) => t !== null);
      lines = richsync.map((line, idx) => ({
        index: idx,
        ts: line.ts,
        te: line.te,
        text: line.text,
        words: line.words,
        translation: translations[idx],
      }));
    } else {
      // Middle tier: no word-level richsync, but Musixmatch may still have
      // line-level timing via subtitles. This keeps Listen highlighting (per
      // line) and Practice + grading available for many more songs.
      const subtitles = await getSubtitles(trackId);
      const timed = (subtitles ?? []).filter((l) => l.text.trim().length > 0);
      if (timed.length > 0) {
        syncLevel = "line";
        const translations = await translateLines(
          timed.map((l) => l.text),
          lang,
        );
        hasTranslation = translations.some((t) => t !== null);
        lines = timed.map((line, idx) => {
          const next = idx + 1 < timed.length ? timed[idx + 1].time : null;
          // Guard against non-increasing LRC timestamps so every line keeps a
          // positive duration (else highlighting/model playback stops instantly).
          const te =
            next !== null ? Math.max(next, line.time + 0.5) : line.time + 6;
          return {
            index: idx,
            ts: line.time,
            te,
            text: line.text,
            words: [],
            translation: translations[idx],
          };
        });
      }
    }

    // Last-resort fallback: no timing at all; surface plain lyrics + a full
    // translation so the learner can still read along (Practice is disabled).
    let plainLyrics: string | null = null;
    if (syncLevel === "none") {
      plainLyrics = lyrics?.body ?? null;
      if (plainLyrics && translationAvailable()) {
        const sourceLines = plainLyrics.split(/\r?\n/);
        const translated = await translateLines(sourceLines, lang);
        if (translated.some((t) => t !== null)) {
          hasTranslation = true;
          const merged = sourceLines
            .map((src, i) => translated[i] ?? src)
            .join("\n");
          plainLyrics = `${plainLyrics}\n\n— — —\n\n${merged}`;
        }
      }
    }

    const payload = {
      track,
      lines,
      plainLyrics,
      copyright: lyrics?.copyright ?? "",
      hasRichsync: syncLevel === "word",
      hasTranslation,
      syncLevel,
      targetLanguage: lang,
    };

    res.json(GetTrackSessionResponse.parse(payload));
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
