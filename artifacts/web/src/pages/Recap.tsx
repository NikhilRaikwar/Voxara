import { useLocation } from "wouter";
import { useSession } from "../store/SessionContext";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { ArrowRight, RotateCcw } from "lucide-react";

export default function Recap() {
  const [location, setLocation] = useLocation();
  const { currentTrack, attempts, clearSession } = useSession();
  const { t } = useI18n();

  if (!currentTrack) {
    setLocation('/');
    return null;
  }

  const linesAttempted = new Set(attempts.map(a => a.lineIndex)).size;
  const totalScore = attempts.reduce((acc, curr) => acc + curr.scorePercent, 0);
  const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;

  const handlePracticeAgain = () => {
    setLocation('/listen');
  };

  const handleNewSong = () => {
    clearSession();
    setLocation('/track');
  };

  return (
    <div className="flex-1 flex flex-col container mx-auto max-w-2xl px-4 py-16 items-center justify-center">
      <div className="w-full bg-card border border-border/50 rounded-3xl p-10 text-center shadow-sm animate-in slide-in-from-bottom-8 duration-700 fade-in">
        
        {currentTrack.albumCoverUrl && (
          <img src={currentTrack.albumCoverUrl} alt="Cover" className="w-24 h-24 rounded-2xl shadow-md object-cover mx-auto mb-6" />
        )}
        
        <h1 className="text-3xl font-bold mb-2">{t('recap.complete')}</h1>
        <p className="text-muted-foreground text-lg mb-10">
          {t('recap.byArtist', { trackName: currentTrack.trackName, artistName: currentTrack.artistName })}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <div className="text-5xl font-bold text-primary mb-2">{linesAttempted}</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('recap.linesPracticed')}</div>
          </div>
          
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <div className="text-5xl font-bold text-primary mb-2">{avgScore}%</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('recap.avgAccuracy')}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button variant="outline" size="lg" onClick={handlePracticeAgain} className="gap-2 h-14 text-base rounded-xl">
            <RotateCcw className="w-5 h-5" /> {t('recap.practiceMore')}
          </Button>
          <Button size="lg" onClick={handleNewSong} className="gap-2 h-14 text-base rounded-xl shadow-md shadow-primary/20">
            {t('recap.findNew')} <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
