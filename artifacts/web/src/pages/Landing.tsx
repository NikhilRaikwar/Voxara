import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Music, TrendingUp } from "lucide-react";
import {
  useGetFeaturedTracks,
  useGetTrendingTracks,
} from "@workspace/api-client-react";
import { useSession } from "../store/SessionContext";
import { TrackCard } from "../components/TrackCard";

export default function Landing() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const { targetLanguage, setCurrentTrack } = useSession();

  const { data: featuredTracks, isLoading } = useGetFeaturedTracks({ selected_language: targetLanguage });
  const { data: trendingTracks, isLoading: trendingLoading } = useGetTrendingTracks({ selected_language: targetLanguage });

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
          Master any language through the <span className="text-primary relative inline-block">
            music you love
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/30" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0 10 Q 50 20 100 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-serif italic max-w-xl mx-auto">
          Voxara turns your favorite tracks into interactive pronunciation lessons. Sing along, get graded, and perfect your accent.
        </p>
      </div>

      <form onSubmit={handleSearch} className="w-full max-w-xl mb-24 relative animate-in slide-in-from-bottom-8 duration-700 delay-150 fade-in fill-mode-both">
        <div className="relative group shadow-sm rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-5 bg-transparent border-none rounded-2xl text-lg outline-none placeholder:text-muted-foreground/60"
            placeholder="Search for a song or artist..."
          />
          <button 
            type="submit"
            className="absolute inset-y-2 right-2 px-6 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
          >
            Find Track
          </button>
        </div>
      </form>

      <div className="w-full animate-in slide-in-from-bottom-12 duration-700 delay-300 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Featured Demo Tracks</h2>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
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
            No featured tracks found for this language.
          </div>
        )}
      </div>

      <div className="w-full mt-16 animate-in slide-in-from-bottom-12 duration-700 delay-500 fade-in fill-mode-both">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Trending Now</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Today's most popular tracks — with real streaming, Shazam and playlist numbers.
        </p>

        {trendingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
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
            Trending tracks are unavailable right now.
          </div>
        )}
      </div>
    </div>
  );
}
