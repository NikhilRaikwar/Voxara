import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Music, TrendingUp, Sparkles, Flame } from "lucide-react";
import {
  useGetFeaturedTracks,
  useGetTrendingTracks,
  useGetBreakoutTracks,
  useDiscoverByMood,
  getDiscoverByMoodQueryKey,
} from "@workspace/api-client-react";
import { useSession } from "../store/SessionContext";
import { useI18n } from "../i18n/I18nContext";
import { TrackCard } from "../components/TrackCard";
import { demoTrack } from "../data/demoTrack";

const MOODS = [
  "heartbreak",
  "hype",
  "nostalgic",
  "romantic",
  "hopeful",
  "chill",
] as const;
type Mood = (typeof MOODS)[number];

export default function Landing() {
  const [query, setQuery] = useState("");
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [, setLocation] = useLocation();
  const { targetLanguage, setCurrentTrack, clearSession } = useSession();
  const { t } = useI18n();

  const { data: featuredTracks, isLoading } = useGetFeaturedTracks({
    selected_language: targetLanguage,
  });
  const { data: trendingTracks, isLoading: trendingLoading } =
    useGetTrendingTracks({ selected_language: targetLanguage });
  const { data: breakoutTracks, isLoading: breakoutLoading } =
    useGetBreakoutTracks();

  const { data: moodTracks, isLoading: moodLoading } = useDiscoverByMood(
    { mood: activeMood ?? "heartbreak" },
    {
      query: {
        enabled: !!activeMood,
        queryKey: getDiscoverByMoodQueryKey({
          mood: activeMood ?? "heartbreak",
        }),
      },
    },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/track?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center pt-24 pb-12 px-4 container mx-auto max-w-4xl">
      <div className="text-center max-w-2xl mx-auto space-y-6 mb-16 animate-in slide-in-from-bottom-4 duration-700 fade-in">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          {t("landing.titlePre")}{" "}
          <span className="text-primary relative inline-block">
            {t("landing.titleHighlight")}
            <svg
              className="absolute w-full h-3 -bottom-1 left-0 text-primary/30"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
            >
              <path
                d="M0 10 Q 50 20 100 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-serif italic max-w-xl mx-auto">
          {t("landing.subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="w-full max-w-xl mb-16 relative animate-in slide-in-from-bottom-8 duration-700 delay-150 fade-in fill-mode-both"
      >
        <div className="relative group shadow-sm rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-5 bg-transparent border-none rounded-2xl text-lg outline-none placeholder:text-muted-foreground/60"
            placeholder={t("landing.searchPlaceholder")}
          />
          <button
            type="submit"
            className="absolute inset-y-2 right-2 px-6 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
          >
            {t("landing.findTrack")}
          </button>
        </div>
      </form>

      <div className="-mt-10 mb-16 text-center animate-in fade-in duration-700 delay-200 fill-mode-both">
        <button
          type="button"
          onClick={() => {
            clearSession();
            setCurrentTrack(demoTrack);
            setLocation("/listen");
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline active:scale-95 transition-transform"
        >
          <Sparkles className="w-4 h-4" />
          {t("landing.tryDemo")}
        </button>
      </div>

      <div className="w-full mb-16 animate-in slide-in-from-bottom-10 duration-700 delay-200 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("landing.moodTitle")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t("landing.moodSub")}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() =>
                setActiveMood((cur) => (cur === mood ? null : mood))
              }
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                activeMood === mood
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              {t(`mood.${mood}` as const)}
            </button>
          ))}
        </div>

        {activeMood &&
          (moodLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : moodTracks && moodTracks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moodTracks.map((track, i) => (
                <div
                  key={track.trackId}
                  className="animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <TrackCard
                    track={track}
                    onClick={() => {
                      setCurrentTrack(track);
                      setLocation(`/listen`);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">
              {t("landing.moodUnavailable")}
            </div>
          ))}
      </div>

      <div className="w-full animate-in slide-in-from-bottom-12 duration-700 delay-300 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("landing.featured")}</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : featuredTracks && featuredTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTracks.map((track, i) => (
              <div
                key={track.trackId}
                className="animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
                style={{ animationDelay: `${400 + i * 100}ms` }}
              >
                <TrackCard
                  track={track}
                  onClick={() => {
                    setCurrentTrack(track);
                    setLocation(`/listen`);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">
            {t("landing.noFeatured")}
          </div>
        )}
      </div>

      <div className="w-full mt-16 animate-in slide-in-from-bottom-12 duration-700 delay-500 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("landing.trending")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t("landing.trendingSub")}
        </p>

        {trendingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : trendingTracks && trendingTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingTracks.map((track, i) => (
              <div
                key={track.trackId}
                className="animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <TrackCard
                  track={track}
                  onClick={() => {
                    setCurrentTrack(track);
                    setLocation(`/listen`);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">
            {t("landing.trendingUnavailable")}
          </div>
        )}
      </div>

      <div className="w-full mt-16 animate-in slide-in-from-bottom-12 duration-700 delay-700 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("landing.breakout")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t("landing.breakoutSub")}
        </p>

        {breakoutLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : breakoutTracks && breakoutTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {breakoutTracks.map((track, i) => (
              <div
                key={track.trackId}
                className="relative animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {i < 3 && (
                  <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                    <Flame className="w-3 h-3" />#{i + 1}
                  </div>
                )}
                <TrackCard
                  track={track}
                  onClick={() => {
                    setCurrentTrack(track);
                    setLocation(`/listen`);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">
            {t("landing.breakoutUnavailable")}
          </div>
        )}
      </div>
    </div>
  );
}
