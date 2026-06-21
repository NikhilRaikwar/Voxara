import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { en, StringKey } from "./strings";
import { translateUiBundle } from "../lib/api-extra";
import { useSession } from "../store/SessionContext";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const STORAGE_PREFIX = "voxara_i18n_";
const KEYS = Object.keys(en) as StringKey[];

type Dict = Record<string, string>;

interface I18nContextType {
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  language: string;
  isTranslating: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { targetLanguage } = useSession();
  // null => render the English source strings directly.
  const [dict, setDict] = useState<Dict | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const lang = (targetLanguage || "en").toLowerCase();

    // Basic RTL support for right-to-left scripts.
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    if (lang === "en") {
      setDict(null);
      setIsTranslating(false);
      return;
    }

    // Serve from the per-language cache when it covers every current key.
    const cacheKey = STORAGE_PREFIX + lang;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Dict;
        if (KEYS.every((k) => typeof parsed[k] === "string")) {
          setDict(parsed);
          setIsTranslating(false);
          return;
        }
      }
    } catch {
      // Corrupt cache entry — fall through and re-fetch.
    }

    let cancelled = false;
    setIsTranslating(true);
    const values = KEYS.map((k) => en[k]);

    translateUiBundle(values, lang)
      .then((translations) => {
        if (cancelled) return;
        const next: Dict = {};
        KEYS.forEach((k, i) => {
          const v = translations[i];
          next[k] = v && v.trim() ? v : en[k];
        });
        setDict(next);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          // Storage full or unavailable — translations still apply this session.
        }
      })
      .catch(() => {
        // Translation unavailable — fall back to English.
        if (!cancelled) setDict(null);
      })
      .finally(() => {
        if (!cancelled) setIsTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetLanguage]);

  const t = (key: StringKey, vars?: Record<string, string | number>) => {
    const template = (dict && dict[key]) || en[key];
    return interpolate(template, vars);
  };

  return (
    <I18nContext.Provider value={{ t, language: targetLanguage, isTranslating }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
