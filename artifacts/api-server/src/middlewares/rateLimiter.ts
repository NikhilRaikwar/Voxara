import { rateLimit } from "express-rate-limit";

const windowMs15 = 15 * 60 * 1000;
const windowMs1 = 60 * 1000;

/**
 * Tight limit for ElevenLabs audio-isolation calls.
 * Each request is synchronous, memory-intensive, and bills the ElevenLabs account.
 * 5 requests / 15 min per IP — covers reasonable single-song workflow while
 * blocking bulk scripted abuse.
 */
export const isolationLimiter = rateLimit({
  windowMs: windowMs15,
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many isolation requests from this IP. Please wait before trying again.",
  },
});

/**
 * Tight limit for ElevenLabs STT grade calls.
 * A user might replay a line several times, but large bursts drain credits.
 * 15 requests / 15 min per IP.
 */
export const gradeLimiter = rateLimit({
  windowMs: windowMs15,
  max: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many grading requests from this IP. Please wait before trying again.",
  },
});

/**
 * Limit for the model-pronunciation TTS endpoint.
 * Each call bills ElevenLabs for speech synthesis. The client caches synthesized
 * line audio per line, so legitimate use is roughly one call per distinct line a
 * learner practices. 40 requests / 15 min per IP covers a full multi-line song
 * (with replays served from cache) while blocking use as an open TTS proxy.
 */
export const ttsLimiter = rateLimit({
  windowMs: windowMs15,
  max: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many pronunciation requests from this IP. Please wait before trying again.",
  },
});

/**
 * Moderate limit for the session endpoint.
 * Each call fans out to Musixmatch + OpenAI translation — expensive.
 * 30 requests / 15 min per IP.
 */
export const sessionLimiter = rateLimit({
  windowMs: windowMs15,
  max: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many session requests from this IP. Please wait before trying again.",
  },
});

/**
 * Limit for the UI-translation endpoint.
 * Each call fans out to a paid LLM to translate the UI string bundle. The client
 * caches results per language in localStorage, so legitimate use is infrequent
 * (roughly one call per language a user selects). 20 requests / 15 min per IP
 * comfortably covers trying many languages while blocking use as an open,
 * unthrottled translation proxy for credit-exhaustion abuse.
 */
export const translateLimiter = rateLimit({
  windowMs: windowMs15,
  max: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many translation requests from this IP. Please wait before trying again.",
  },
});

/**
 * Strict limit for the Breakout endpoint.
 * Unlike the other track-lookup routes, a single cold-cache request fans out to
 * ~2 Songstats calls per chart entry (search + stats) across the whole chart —
 * the highest paid-provider multiplier of any GET route. The result only changes
 * on the order of the Songstats cache TTL (10 min), so legitimate clients need
 * very few calls. 10 requests / 15 min per IP blocks quota-exhaustion abuse
 * while comfortably covering normal page loads (served from cache after warm-up).
 */
export const breakoutLimiter = rateLimit({
  windowMs: windowMs15,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many breakout requests from this IP. Please wait before trying again.",
  },
});

/**
 * General limit for low-cost track lookup endpoints
 * (search, featured, trending, stats).
 * 60 requests / min per IP — generous for normal browsing, blocks scripted loops.
 */
export const tracksLimiter = rateLimit({
  windowMs: windowMs1,
  max: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP. Please wait before trying again.",
  },
});
