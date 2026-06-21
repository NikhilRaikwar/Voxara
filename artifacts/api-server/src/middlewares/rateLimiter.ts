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
    error:
      "Too many requests from this IP. Please wait before trying again.",
  },
});
