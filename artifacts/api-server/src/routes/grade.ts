import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import multer from "multer";
import { transcribe } from "../lib/elevenlabs";
import { gradeAttempt } from "../lib/grading";
import { gradeLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// Practice recordings are a single lyric line — 5 MB is generous headroom
// while still blocking trivially oversized payloads on this public route.
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_MB = MAX_FILE_BYTES / 1024 / 1024;

// ── Admission control ─────────────────────────────────────────────────────────
// This middleware MUST run before multer so that concurrent-request checks fire
// before any upload data is read into memory. Without this ordering, an attacker
// can open many parallel uploads and force large in-memory buffers even if the
// handler logic later rejects them.
const MAX_CONCURRENT = 5;
let inFlight = 0;

function admissionControl(req: Request, res: Response, next: NextFunction): void {
  if (inFlight >= MAX_CONCURRENT) {
    res
      .status(503)
      .json({ error: "Server is busy — please try again in a moment." });
    return;
  }
  inFlight++;
  // Decrement exactly once when the response ends, whether it succeeds, errors,
  // or the client aborts. Using a flag prevents double-decrement if both
  // "finish" and "close" fire on the same response.
  let decremented = false;
  const decrement = (): void => {
    if (!decremented) {
      decremented = true;
      inFlight--;
    }
  };
  res.on("finish", decrement);
  res.on("close", decrement);
  next();
}

// ── Multer — disk storage ─────────────────────────────────────────────────────
// Using diskStorage (not memoryStorage) so upload bodies are written to a temp
// file rather than held in heap. This bounds per-request heap growth to the
// window between reading the temp file and forwarding to ElevenLabs, not the
// entire upload phase.
const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, _file, cb) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, `voxara-grade-${id}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES },
});

// Wrap multer so its LIMIT_FILE_SIZE error becomes a proper 413 instead of 500.
function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `File too large — maximum size is ${MAX_FILE_MB} MB.`,
      });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────
// The temp file is deleted after use regardless of success or error.
router.post(
  "/grade",
  gradeLimiter,
  admissionControl,
  uploadMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const tempPath = req.file?.path;
    try {
      if (!req.file || !tempPath) {
        res.status(400).json({ error: "A recording file is required" });
        return;
      }

      const expected =
        typeof req.body?.expected === "string" ? req.body.expected : "";
      if (!expected.trim()) {
        res.status(400).json({ error: "Expected line text is required" });
        return;
      }
      const languageCode =
        typeof req.body?.language_code === "string" && req.body.language_code
          ? req.body.language_code
          : undefined;

      // Read the temp file into memory only when we are ready to forward it.
      // Because admission control caps concurrency, at most MAX_CONCURRENT
      // requests hold a buffer at the same time.
      const buffer = await fs.readFile(tempPath);

      const scribe = await transcribe(
        buffer,
        req.file.originalname || "recording.webm",
        req.file.mimetype,
        languageCode,
      );

      const outcome = gradeAttempt(expected, scribe.transcript);

      res.json({
        scorePercent: outcome.scorePercent,
        transcript: scribe.transcript,
        words: outcome.words,
        extraWords: outcome.extraWords,
      });
    } catch (err) {
      next(err);
    } finally {
      if (tempPath) {
        await fs.unlink(tempPath).catch(() => {});
      }
    }
  },
);

export default router;
