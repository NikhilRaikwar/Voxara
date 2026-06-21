import { Router, type IRouter } from "express";
import multer from "multer";
import { transcribe } from "../lib/elevenlabs";
import { gradeAttempt } from "../lib/grading";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/grade", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
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

    const scribe = await transcribe(
      req.file.buffer,
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
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
