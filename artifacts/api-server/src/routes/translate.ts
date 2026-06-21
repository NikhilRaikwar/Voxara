import { Router, type IRouter } from "express";
import { z } from "zod";
import { translateUiStrings, isSupportedLanguage } from "../lib/translate";
import { translateLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// Bounded to keep an anonymous caller from turning this into an unlimited
// translation proxy or exhausting memory with oversized payloads. The language
// is constrained to the UI's known code set so this endpoint stays scoped to
// localizing the interface rather than acting as a general translation proxy.
// The UI bundle is ~60 short interface strings, so these bounds sit just above
// real usage: they fit the whole bundle with headroom but cap worst-case LLM
// spend per request far below an open free-text translation proxy.
const TranslateBody = z.object({
  texts: z.array(z.string().max(400)).min(1).max(120),
  language: z.string().min(2).max(12).refine(isSupportedLanguage, {
    message: "Unsupported language",
  }),
});

router.post("/translate", translateLimiter, async (req, res, next) => {
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
