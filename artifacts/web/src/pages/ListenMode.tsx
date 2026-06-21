import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, UploadCloud, PlayCircle, PauseCircle, Loader2, Mic } from "lucide-react";
import { useGetTrackSession, getGetTrackSessionQueryKey } from "@workspace/api-client-react";
import { useSession } from "../store/SessionContext";
import { useI18n } from "../i18n/I18nContext";
import { useAudioIsolation } from "../hooks/useAudioIsolation";
import { Button } from "../components/ui/button";

export default function ListenMode() {
  const [location, setLocation] = useLocation();
  const { currentTrack, targetLanguage, vocalUrl, setVocalUrl } = useSession();
  const { t } = useI18n();
  
  if (!currentTrack) {
    setLocation('/track');
    return null;
  }

  const { data: sessionData, isLoading: isLoadingSession, isError: isSessionError } = useGetTrackSession(
    { trackId: currentTrack.trackId, selected_language: targetLanguage },
    {
      query: {
        enabled: !!currentTrack.trackId,
        queryKey: getGetTrackSessionQueryKey({
          trackId: currentTrack.trackId,
          selected_language: targetLanguage,
        }),
      },
    }
  );

  const { startIsolation, status: isolationStatus, vocalUrl: isolatedUrl, error: isolationError } = useAudioIsolation();

  useEffect(() => {
    if (isolatedUrl && !vocalUrl) {
      setVocalUrl(isolatedUrl);
    }
  }, [isolatedUrl, vocalUrl, setVocalUrl]);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeLineIdx, setActiveLineIdx] = useState<number>(-1);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    if (sessionData && sessionData.lines.length > 0) {
      const idx = sessionData.lines.findIndex(l => time >= l.ts && time <= l.te);
      if (idx !== -1) setActiveLineIdx(idx);
    }
  };

  const goToPractice = (lineIdx: number) => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setLocation(`/practice?line=${lineIdx}`);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startIsolation(file);
    }
  };

  if (!vocalUrl) {
    return (
      <div className="flex-1 flex flex-col container mx-auto max-w-3xl px-4 py-8 items-center justify-center">
        <button onClick={() => setLocation('/track')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground self-start mb-8">
          <ArrowLeft className="w-4 h-4" /> <span>{t('listen.backToSearch')}</span>
        </button>

        <div className="w-full bg-card border border-border/50 rounded-2xl p-12 text-center shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{t('listen.provideAudio')}</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t('listen.uploadPrompt', { trackName: currentTrack.trackName })}
          </p>

          {isolationStatus === 'idle' || isolationStatus === 'error' ? (
            <div className="space-y-4">
              {isolationError && (
                <div className="text-destructive bg-destructive/10 p-4 rounded-xl text-sm mb-4">
                  {isolationError}
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 cursor-pointer shadow-md active:scale-95 transition-all">
                <UploadCloud className="w-5 h-5" />
                <span>{t('listen.selectFile')}</span>
                <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
              </label>
              <p className="text-xs text-muted-foreground mt-4">{t('listen.fileTypes')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
              <h3 className="text-xl font-semibold mb-2">{t('listen.isolating')}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                {t('listen.isolatingSub')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setLocation('/track')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> <span>{t('listen.backToSearch')}</span>
        </button>
        <button onClick={() => setLocation('/recap')} className="text-sm font-medium text-primary hover:underline">
          {t('listen.viewRecap')}
        </button>
      </div>

      <div className="flex items-center gap-6 mb-8 bg-card border border-border/50 p-6 rounded-2xl shadow-sm">
        {currentTrack.albumCoverUrl && (
          <img src={currentTrack.albumCoverUrl} alt="Cover" className="w-24 h-24 rounded-lg shadow-sm object-cover" />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{currentTrack.trackName}</h1>
          <p className="text-muted-foreground">{currentTrack.artistName}</p>
        </div>
        <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all">
          {isPlaying ? <PauseCircle className="w-10 h-10" /> : <PlayCircle className="w-10 h-10" />}
        </button>
      </div>

      <audio
        ref={audioRef}
        src={vocalUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {isLoadingSession ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : isSessionError || !sessionData ? (
        <div className="text-center py-12 text-destructive">{t('listen.failedSession')}</div>
      ) : (
        <div className="flex-1 space-y-8 pb-20">
          {sessionData.syncLevel === 'none' && (
            <div className="bg-muted text-muted-foreground p-4 rounded-xl text-center text-sm mb-8">
              {t('listen.syncNone')}
            </div>
          )}

          {sessionData.syncLevel !== 'none' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-4 mb-2">
              <div>
                <p className="font-semibold text-foreground">{t('listen.readyToPractice')}</p>
                <p className="text-sm text-muted-foreground">
                  {sessionData.syncLevel === 'word'
                    ? t('listen.readyWord')
                    : t('listen.readyLine')}
                </p>
              </div>
              <Button size="lg" className="shrink-0 gap-2" onClick={() => goToPractice(0)}>
                <Mic className="w-4 h-4" /> {t('listen.startPractice')}
              </Button>
            </div>
          )}

          {sessionData.syncLevel !== 'none' ? (
            <div className="space-y-6">
              {sessionData.lines.map((line, idx) => {
                const isActive = activeLineIdx === idx;
                const isPast = activeLineIdx > idx;
                
                return (
                  <div key={idx} className={`p-4 rounded-xl transition-all duration-300 group ${isActive ? 'bg-card border-primary/30 border shadow-sm scale-105 transform origin-left' : 'opacity-60 hover:opacity-100'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 flex flex-wrap gap-x-1.5 gap-y-1 text-2xl md:text-3xl font-bold">
                        {line.words.length > 0 ? (
                          line.words.map((word, wIdx) => {
                            const isWordActive = currentTime >= word.start && currentTime <= word.end;
                            const isWordPast = currentTime > word.end;
                            return (
                              <span 
                                key={wIdx} 
                                className={`transition-colors duration-200 cursor-pointer hover:text-primary ${isWordActive ? 'text-primary' : isWordPast ? 'text-foreground' : 'text-muted-foreground/50'}`}
                                title={line.translation || undefined}
                              >
                                {word.text}
                              </span>
                            );
                          })
                        ) : (
                          <span
                            className={`transition-colors duration-200 ${isActive ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground/50'}`}
                            title={line.translation || undefined}
                          >
                            {line.text}
                          </span>
                        )}
                      </div>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => goToPractice(idx)}
                      >
                        {t('listen.practice')}
                      </Button>
                    </div>
                    {isActive && line.translation && (
                      <p className="mt-3 text-lg text-primary/80 font-serif italic animate-in fade-in slide-in-from-top-2">
                        {line.translation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-xl leading-relaxed text-center opacity-80 max-w-2xl mx-auto">
              {sessionData.plainLyrics || t('listen.noLyrics')}
            </div>
          )}
          
          <div className="text-center pt-12 text-xs text-muted-foreground/60 max-w-sm mx-auto">
            {sessionData.copyright}
          </div>
        </div>
      )}
    </div>
  );
}
