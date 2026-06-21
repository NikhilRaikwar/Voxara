import { Router, type IRouter } from "express";
import multer from "multer";
import { isolateVocals } from "../lib/elevenlabs";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Vocal isolation is synchronous: ElevenLabs returns the isolated audio bytes
// in one call, so we run it inline and stream the resulting vocal stem back to
// the browser (which plays it from an in-memory blob URL). No job/polling.
router.post("/isolation", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "An audio file is required" });
      return;
    }
    const { audio, contentType } = await isolateVocals(
      req.file.buffer,
      req.file.originalname || "track.mp3",
      req.file.mimetype,
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", audio.length);
    res.send(audio);
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
