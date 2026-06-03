import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus, WifiOff, Home, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "dlh_install_prompt_dismissed";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInPreviewIframe() {
  if (window.self !== window.top) return true;
  const h = location.hostname;
  return h.startsWith("id-preview--") || h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com");
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [variant, setVariant] = useState<"android" | "ios">("android");

  useEffect(() => {
    if (isStandalone() || isInPreviewIframe()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVariant("android");
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari: no beforeinstallprompt — show instruction card
    if (isIOS()) {
      setVariant("ios");
      const t = setTimeout(() => setShow(true), 1500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBIP); };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 22 }}
          className="fixed left-3 right-3 bottom-3 z-[100] mx-auto max-w-md rounded-2xl border border-border bg-background shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          role="dialog"
          aria-label="Install DLH Smart Tutor"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Download className="text-primary-foreground" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base leading-tight">Install DLH Smart Tutor</p>
              <p className="text-xs text-muted-foreground">
                {variant === "ios" ? "Add to your Home Screen for the full app experience." : "Get the app on your phone."}
              </p>
            </div>
          </div>

          <ul className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
            <li className="flex flex-col items-center gap-1 text-center"><WifiOff size={14} /> Faster access</li>
            <li className="flex flex-col items-center gap-1 text-center"><Home size={14} /> Home screen icon</li>
            <li className="flex flex-col items-center gap-1 text-center"><Bell size={14} /> Stay updated</li>
          </ul>

          {variant === "android" ? (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={dismiss}>Not now</Button>
              <Button className="flex-1 bg-gradient-primary" onClick={install} disabled={!deferred}>
                <Download className="mr-2 h-4 w-4" /> Install
              </Button>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs space-y-2">
              <p className="font-semibold">To install on iPhone:</p>
              <ol className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">1</span>
                  Tap the <Share size={12} className="inline mx-0.5" /> Share button in Safari
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">2</span>
                  Scroll and tap <Plus size={12} className="inline mx-0.5" /> "Add to Home Screen"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">3</span>
                  Tap "Add" to confirm
                </li>
              </ol>
              <Button variant="ghost" size="sm" className="w-full mt-1" onClick={dismiss}>Got it</Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
