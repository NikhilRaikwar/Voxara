import { useEffect, useState } from "react";
import { Music, X } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "./ui/button";

const SEEN_KEY = "voxara_first_run_seen";

// One-time, dismissible explainer shown the first time a learner reaches a track
// (Listen mode). It sets expectations up front — lyrics/translation need no
// upload, audio playback is optional — so the upload card later never reads as a
// hard gate. Gated by localStorage so returning users never see it again.
export function FirstRunExplainer() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (e.g. privacy mode) — just skip the explainer.
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Ignore persistence failures; closing still works for this session.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firstrun-title"
    >
      <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-2">
        <button
          onClick={dismiss}
          aria-label={t("firstrun.dismiss")}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <h2 id="firstrun-title" className="text-lg font-semibold">
            {t("firstrun.title")}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {t("firstrun.body1")}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {t("firstrun.body2")}
        </p>

        <Button className="w-full" onClick={dismiss}>
          {t("firstrun.gotIt")}
        </Button>
      </div>
    </div>
  );
}
