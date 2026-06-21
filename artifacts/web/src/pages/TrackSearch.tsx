import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { useSearchTracks, getSearchTracksQueryKey } from "@workspace/api-client-react";
import { useSession } from "../store/SessionContext";
import { useI18n } from "../i18n/I18nContext";
import { TrackCard } from "../components/TrackCard";

export default function TrackSearch() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const { setCurrentTrack } = useSession();
  const { t } = useI18n();

  const { data: searchResults, isLoading, isError } = useSearchTracks(
    { q: activeQuery },
    {
      query: {
        enabled: !!activeQuery,
        queryKey: getSearchTracksQueryKey({ q: activeQuery }),
      },
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveQuery(query.trim());
      // Update URL without navigation
      window.history.replaceState(null, '', `/track?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // If no query and user just navigated here without params, they can type.
  return (
    <div className="flex-1 flex flex-col container mx-auto max-w-4xl px-4 py-8">
      
      <button 
        onClick={() => setLocation('/')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors self-start w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('search.backHome')}</span>
      </button>

      <form onSubmit={handleSearch} className="w-full relative mb-10">
        <div className="relative group bg-card border border-border rounded-xl hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-xl text-lg outline-none"
            placeholder={t('search.placeholder')}
            autoFocus={!initialQuery}
          />
        </div>
      </form>

      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
            <p>{t('search.error')}</p>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{t('search.results')}</h2>
            {searchResults.map((track, i) => (
              <div 
                key={track.trackId}
                className="animate-in slide-in-from-bottom-2 fade-in fill-mode-both"
                style={{ animationDelay: `${i * 50}ms` }}
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
        ) : activeQuery ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-border/50 text-muted-foreground">
            <p className="text-lg">{t('search.noResults', { query: activeQuery })}</p>
            <p className="text-sm mt-2">{t('search.tryDifferent')}</p>
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            {t('search.enterTerm')}
          </div>
        )}
      </div>
    </div>
  );
}
