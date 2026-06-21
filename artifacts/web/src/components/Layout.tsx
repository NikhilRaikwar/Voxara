import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Globe, Loader2 } from 'lucide-react';
import { useSession } from '../store/SessionContext';
import { useI18n } from '../i18n/I18nContext';
import { Logo } from './Logo';

// Languages offered for lyric translation. The translation pipeline is
// LLM-based, so any of these works; codes mirror the server's name map.
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'pl', label: 'Polish' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'el', label: 'Greek' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'he', label: 'Hebrew' },
  { code: 'fa', label: 'Persian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ur', label: 'Urdu' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { targetLanguage, setTargetLanguage } = useSession();
  const { t, isTranslating } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="w-9 h-9 shadow-sm rounded-[8px] group-hover:scale-105 transition-transform" />
            <span className="font-semibold text-lg tracking-tight">Voxara</span>
          </Link>

          <div className="flex items-center gap-2">
            {isTranslating ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Globe className="w-4 h-4 text-muted-foreground hidden sm:block" />
            )}
            <label htmlFor="lang-select" className="text-sm text-muted-foreground hidden sm:block">
              {isTranslating ? t('nav.translating') : t('nav.language')}
            </label>
            <select
              id="lang-select"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer max-h-72"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
