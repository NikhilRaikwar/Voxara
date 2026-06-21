import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import multer from "multer";
import { isolateVocals } from "../lib/elevenlabs";
import { isolationLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// Keep file size conservative for a public unauthenticated endpoint.
// A typical full-length MP3 at 128 kbps is well under 10 MB; 20 MB gives
// comfortable headroom without allowing trivially oversized uploads.
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_FILE_MB = MAX_FILE_BYTES / 1024 / 1024;

// ── Admission control ─────────────────────────────────────────────────────────
// This middleware MUST run before multer so that concurrent-request checks fire
// before any upload data is read into memory. Without this ordering, an attacker
// can open many parallel uploads and force large in-memory buffers even if the
// handler logic later rejects them.
const MAX_CONCURRENT = 3;
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
      cb(null, `voxara-isolation-${id}`);
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
// Vocal isolation is synchronous: ElevenLabs returns the isolated audio in one
// call. We pipe its response body directly to the client — the processed audio
// is never buffered in server heap. The temp file is deleted after use.
router.post(
  "/isolation",
  isolationLimiter,
  admissionControl,
  uploadMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const tempPath = req.file?.path;
    try {
      if (!req.file || !tempPath) {
        res.status(400).json({ error: "An audio file is required" });
        return;
      }

      // Read the temp file into memory only when we are ready to forward it.
      // Because admission control caps concurrency, at most MAX_CONCURRENT
      // requests hold a buffer at the same time.
      const buffer = await fs.readFile(tempPath);

      const { body, contentType } = await isolateVocals(
        buffer,
        req.file.originalname || "track.mp3",
        req.file.mimetype,
      );

      res.setHeader("Content-Type", contentType);
      await pipeline(
        Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]),
        res,
      );
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
