import { Router, type IRouter } from "express";
import { z } from "zod";
import { translateUiStrings } from "../lib/translate";

const router: IRouter = Router();

// Bounded to keep an anonymous caller from turning this into an unlimited
// translation proxy or exhausting memory with oversized payloads.
const TranslateBody = z.object({
  texts: z.array(z.string().max(2000)).min(1).max(300),
  language: z.string().min(2).max(12),
});

router.post("/translate", async (req, res, next) => {
  try {
    const parsed = TranslateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid translation request" });
      return;
    }
    const { texts, language } = parsed.data;

    // English is the source of truth; no round-trip needed.
    if (language.toLowerCase() === "en") {
      res.json({ translations: texts });
      return;
    }

    const translations = await translateUiStrings(texts, language);
    res.json({ translations });
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
