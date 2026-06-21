import {
  Track,
  useGetTrackStats,
  getGetTrackStatsQueryKey,
} from '@workspace/api-client-react';
import { Headphones, ListMusic, Music2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useI18n } from '../i18n/I18nContext';
import type { StringKey } from '../i18n/strings';

interface TrackCardProps {
  track: Track;
  onClick?: () => void;
  className?: string;
  showStats?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function TrackStatsRow({ track }: { track: Track }) {
  const { t } = useI18n();
  const { data: stats, isLoading } = useGetTrackStats(
    { trackName: track.trackName, artistName: track.artistName },
    {
      query: {
        queryKey: getGetTrackStatsQueryKey({
          trackName: track.trackName,
          artistName: track.artistName,
        }),
        staleTime: 1000 * 60 * 60,
      },
    },
  );

  if (isLoading) {
    return <div className="h-4 mt-2 w-24 rounded bg-muted/60 animate-pulse" />;
  }

  if (!stats || !stats.found) return null;

  const items: { icon: typeof Headphones; value: number; labelKey: StringKey }[] = [];
  if (stats.spotifyStreams != null)
    items.push({ icon: Headphones, value: stats.spotifyStreams, labelKey: 'stats.streams' });
  if (stats.shazams != null)
    items.push({ icon: Music2, value: stats.shazams, labelKey: 'stats.shazams' });
  if (stats.playlists != null)
    items.push({ icon: ListMusic, value: stats.playlists, labelKey: 'stats.playlists' });

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
      {items.map(({ icon: Icon, value, labelKey }) => {
        const label = t(labelKey);
        return (
          <span key={labelKey} className="inline-flex items-center gap-1" title={`${value.toLocaleString()} ${label}`}>
            <Icon className="w-3 h-3 text-primary/70" />
            <span className="font-medium text-foreground/80">{formatCount(value)}</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function TrackCard({ track, onClick, className = '', showStats = true }: TrackCardProps) {
  const { t } = useI18n();
  return (
    <Card 
      onClick={onClick}
      className={`overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-300 active:scale-[0.98] border-border/50 hover:border-primary/30 ${className}`}
    >
      <div className="flex p-4 gap-4 items-center">
        <div className="w-16 h-16 rounded-md bg-secondary/50 flex-shrink-0 overflow-hidden relative shadow-sm">
          {track.albumCoverUrl ? (
            <img 
              src={track.albumCoverUrl} 
              alt={track.albumName || track.trackName} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {track.trackName}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {track.artistName}
          </p>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {track.hasRichsync ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none" title={t('card.wordByWordTitle')}>{t('card.wordByWord')}</Badge>
            ) : track.hasSubtitles ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none" title={t('card.linePracticeTitle')}>{t('card.linePractice')}</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/50" title={t('card.readOnlyTitle')}>{t('card.readOnly')}</Badge>
            )}
            
            {track.hasTranslation && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none">{t('card.translation')}</Badge>
            )}
          </div>

          {showStats && <TrackStatsRow track={track} />}
        </div>
      </div>
    </Card>
  );
}
