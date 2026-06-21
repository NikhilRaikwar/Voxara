import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mic, Square, Play, RefreshCw, ChevronRight } from "lucide-react";
import { useGetTrackSession, getGetTrackSessionQueryKey } from "@workspace/api-client-react";
import { useSession } from "../store/SessionContext";
import { useI18n } from "../i18n/I18nContext";
import { useMicRecording } from "../hooks/useMicRecording";
import { gradeRecording } from "../lib/api-extra";
import { Button } from "../components/ui/button";

export default function PracticeMode() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const lineIdxParam = searchParams.get('line');
  
  const { currentTrack, targetLanguage, vocalUrl, addAttempt } = useSession();
  const { t } = useI18n();

  if (!currentTrack || !vocalUrl || lineIdxParam === null) {
    setLocation('/');
    return null;
  }

  const lineIndex = parseInt(lineIdxParam, 10);

  const { data: sessionData } = useGetTrackSession(
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

  const line = sessionData?.lines[lineIndex];

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isModelPlaying, setIsModelPlaying] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, error: micError, clearAudio } = useMicRecording();
  
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<any | null>(null);

  // Auto-play model line on mount
  useEffect(() => {
    if (audioRef.current && line) {
      audioRef.current.currentTime = line.ts;
      audioRef.current.play();
      setIsModelPlaying(true);
    }
  }, [line]);

  const handleTimeUpdate = () => {
    if (audioRef.current && line && audioRef.current.currentTime >= line.te) {
      audioRef.current.pause();
      setIsModelPlaying(false);
    }
  };

  const playModelLine = () => {
    if (audioRef.current && line) {
      audioRef.current.currentTime = line.ts;
      audioRef.current.play();
      setIsModelPlaying(true);
    }
  };

  const playWord = (start: number, end: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      audioRef.current.play();
      // stop after word ends
      const checkEnd = () => {
        if (audioRef.current && audioRef.current.currentTime >= end) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('timeupdate', checkEnd);
        }
      };
      audioRef.current.addEventListener('timeupdate', checkEnd);
    }
  };

  useEffect(() => {
    const processGrade = async () => {
      if (audioBlob && line) {
        setIsGrading(true);
        try {
          const expected = line.text;
          const res = await gradeRecording(audioBlob, expected, targetLanguage);
          setGradingResult(res);
          addAttempt(lineIndex, res.scorePercent);
        } catch (e) {
          console.error(e);
        } finally {
          setIsGrading(false);
        }
      }
    };
    if (audioBlob && !isGrading && !gradingResult) {
      processGrade();
    }
  }, [audioBlob, line, targetLanguage, addAttempt, lineIndex, isGrading, gradingResult]);

  const handleRetry = () => {
    clearAudio();
    setGradingResult(null);
  };

  const handleNext = () => {
    if (sessionData && lineIndex < sessionData.lines.length - 1) {
      clearAudio();
      setGradingResult(null);
      window.history.replaceState(null, '', `/practice?line=${lineIndex + 1}`);
      // re-trigger line play
      if (audioRef.current && sessionData.lines[lineIndex + 1]) {
        audioRef.current.currentTime = sessionData.lines[lineIndex + 1].ts;
        audioRef.current.play();
        setIsModelPlaying(true);
      }
    } else {
      setLocation('/recap');
    }
  };

  if (!line) return null;

  return (
    <div className="flex-1 flex flex-col container mx-auto max-w-3xl px-4 py-8 items-center justify-center min-h-[80vh]">
      <button onClick={() => setLocation('/listen')} className="absolute top-24 left-4 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> <span>{t('practice.backToListen')}</span>
      </button>

      <audio
        ref={audioRef}
        src={vocalUrl}
        onTimeUpdate={handleTimeUpdate}
        className="hidden"
      />

      <div className="w-full max-w-2xl text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight text-foreground">
            {line.text}
          </h2>
          {line.translation && (
            <p className="text-xl md:text-2xl text-primary/80 font-serif italic">
              {line.translation}
            </p>
          )}
        </div>

        <div className="flex justify-center pb-8">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={playModelLine} 
            disabled={isModelPlaying}
            className="rounded-full gap-2 border-primary/20 hover:border-primary/50 text-primary"
          >
            {isModelPlaying ? <span className="animate-pulse">{t('practice.playing')}</span> : <><Play className="w-5 h-5" /> {t('practice.playModel')}</>}
          </Button>
        </div>

        {!gradingResult && !isGrading && (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                isRecording 
                  ? 'bg-destructive text-destructive-foreground animate-pulse scale-110 shadow-destructive/40' 
                  : 'bg-primary text-primary-foreground hover:scale-105 shadow-primary/40'
              }`}
            >
              {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
            </button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? t('practice.tapStop') : t('practice.tapRecord')}
            </p>
            {micError && <p className="text-sm text-destructive">{micError}</p>}
            <p className="text-xs text-muted-foreground/60 max-w-xs text-center mt-4">
              {t('practice.notStored')}
            </p>
          </div>
        )}

        {isGrading && (
          <div className="py-12 flex flex-col items-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="font-medium text-lg text-primary">{t('practice.grading')}</p>
          </div>
        )}

        {gradingResult && (
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm animate-in slide-in-from-bottom-8 fade-in">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
              <h3 className="text-xl font-semibold">{t('practice.results')}</h3>
              <div className={`text-3xl font-bold ${gradingResult.scorePercent > 80 ? 'text-green-600 dark:text-green-500' : gradingResult.scorePercent > 50 ? 'text-amber-500' : 'text-destructive'}`}>
                {gradingResult.scorePercent}%
              </div>
            </div>

            <div className="flex flex-wrap gap-x-2 gap-y-4 justify-center text-xl font-medium mb-10">
              {gradingResult.words.map((gw: any, i: number) => {
                const isMatch = gw.status === 'match';
                const originalWord = line.words.find(w => w.text.toLowerCase() === gw.expected.toLowerCase());
                
                return (
                  <span key={i} className="flex flex-col items-center gap-1 group">
                    <span className={`${isMatch ? 'text-green-600 dark:text-green-500' : 'text-destructive underline decoration-wavy decoration-destructive/50'}`}>
                      {gw.expected}
                    </span>
                    {!isMatch && originalWord && (
                      <button 
                        onClick={() => playWord(originalWord.start, originalWord.end)}
                        className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {t('practice.hear')}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" size="lg" onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" /> {t('practice.tryAgain')}
              </Button>
              <Button size="lg" onClick={handleNext} className="gap-2">
                {t('practice.nextLine')} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
