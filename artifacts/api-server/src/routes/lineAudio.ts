import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getRichsync, getSubtitles } from "../lib/musixmatch";
import { synthesizeLine } from "../lib/elevenlabs";
import { ttsLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// Cap synthesized text defensively. A single lyric line is inherently short, but
// this bounds the payload sent to ElevenLabs regardless of upstream data.
const MAX_LINE_CHARS = 500;

// ── Model-pronunciation TTS ────────────────────────────────────────────────────
// GET /tracks/:trackId/lines/:index/audio?selected_language=es
//
// Returns reference speech for a single lyric line so Practice mode can play the
// "correct" pronunciation without depending on the learner's uploaded audio.
//
// SECURITY: the synthesized text is NOT free user input. It is derived
// server-side from the track's own lyrics (richsync, else line-level subtitles)
// at the requested index, so this endpoint can never be used as an open
// text-to-speech proxy for arbitrary attacker-supplied text.
router.get(
  "/tracks/:trackId/lines/:index/audio",
  ttsLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trackId = Number(req.params.trackId);
      const index = Number(req.params.index);

      if (!Number.isInteger(trackId) || trackId <= 0) {
        res.status(400).json({ error: "A valid trackId is required" });
        return;
      }
      if (!Number.isInteger(index) || index < 0) {
        res.status(400).json({ error: "A valid line index is required" });
        return;
      }

      // `selected_language` is accepted for parity with the session endpoint
      // (so the client can key requests consistently). The model pronunciation
      // is always the ORIGINAL lyric line, whose language is auto-detected by
      // the TTS model from the text itself, so the param does not change which
      // line is spoken.

      // Resolve the original line text the same way the session route builds its
      // lines: prefer word-level richsync, fall back to line-level subtitles.
      const richsync = await getRichsync(trackId);
      let lineText: string | undefined;
      if (richsync && richsync.length > 0) {
        lineText = richsync[index]?.text;
      } else {
        const subtitles = await getSubtitles(trackId);
        const timed = (subtitles ?? []).filter((l) => l.text.trim().length > 0);
        lineText = timed[index]?.text;
      }

      const text = lineText?.trim();
      if (!text) {
        res
          .status(404)
          .json({ error: "No lyric line found for that track and index" });
        return;
      }

      const { body, contentType } = await synthesizeLine(
        text.slice(0, MAX_LINE_CHARS),
      );

      res.setHeader("Content-Type", contentType);
      // Lyric-derived audio must never be persisted/cached (Musixmatch terms).
      res.setHeader("Cache-Control", "no-store");
      await pipeline(
        Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]),
        res,
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
