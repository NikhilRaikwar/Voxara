import { Track } from '@workspace/api-client-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface TrackCardProps {
  track: Track;
  onClick?: () => void;
  className?: string;
}

export function TrackCard({ track, onClick, className = '' }: TrackCardProps) {
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
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none">Synced</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/50">Plain</Badge>
            )}
            
            {track.hasTranslation && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none">Translation</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
