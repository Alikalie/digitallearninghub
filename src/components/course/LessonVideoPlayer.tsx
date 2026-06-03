import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Captions, Maximize } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LessonVideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
  transcript?: string | null;
  isCompleted: boolean;
  onAutoComplete: (lessonId: string) => void;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const THRESHOLD = 0.9;
const SIM_DURATION = 240;
const SAVE_EVERY = 5000;

export function LessonVideoPlayer({
  lessonId,
  videoUrl,
  title,
  transcript,
  isCompleted,
  onAutoComplete,
}: LessonVideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(SIM_DURATION);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [resumed, setResumed] = useState(false);
  const hasAutoCompleted = useRef(isCompleted);
  const direct = isDirectVideo(videoUrl);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedAt = useRef(0);

  // Look for sibling .vtt captions
  const vttUrl = direct ? videoUrl.replace(/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i, ".vtt$2") : null;

  useEffect(() => { hasAutoCompleted.current = isCompleted; }, [isCompleted]);

  // Load saved position
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("course_progress")
        .select("last_position, duration_seconds")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.last_position && data.last_position > 0) {
        setProgress(data.last_position);
        if (data.duration_seconds) setDuration(data.duration_seconds);
        if (direct && videoRef.current) {
          const seekWhenReady = () => {
            if (videoRef.current) videoRef.current.currentTime = data.last_position;
          };
          if (videoRef.current.readyState >= 1) seekWhenReady();
          else videoRef.current.addEventListener("loadedmetadata", seekWhenReady, { once: true });
        }
      }
      setResumed(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, lessonId]);

  // Probe captions track
  useEffect(() => {
    if (!direct || !vttUrl) { setHasCaptions(false); return; }
    let cancelled = false;
    fetch(vttUrl, { method: "HEAD" })
      .then((r) => { if (!cancelled) setHasCaptions(r.ok); })
      .catch(() => { if (!cancelled) setHasCaptions(false); });
    return () => { cancelled = true; };
  }, [vttUrl, direct]);

  const saveProgress = useCallback(async (pos: number, dur: number) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSavedAt.current < SAVE_EVERY) return;
    lastSavedAt.current = now;
    await supabase.from("course_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        last_position: Math.round(pos),
        duration_seconds: Math.round(dur),
        watch_seconds: Math.round(pos),
      } as any,
      { onConflict: "user_id,lesson_id" }
    );
  }, [user, lessonId]);

  const checkComplete = useCallback((current: number, total: number) => {
    if (total > 0 && current / total >= THRESHOLD && !hasAutoCompleted.current) {
      hasAutoCompleted.current = true;
      onAutoComplete(lessonId);
    }
  }, [lessonId, onAutoComplete]);

  // Simulated tick
  useEffect(() => {
    if (direct) return;
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 1, duration);
        checkComplete(next, duration);
        saveProgress(next, duration);
        if (next >= duration) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, direct, duration, checkComplete, saveProgress]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime);
    setDuration(v.duration);
    checkComplete(v.currentTime, v.duration);
    saveProgress(v.currentTime, v.duration);
  };

  const toggle = useCallback(() => {
    if (direct && videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setPlaying(true); }
      else { videoRef.current.pause(); setPlaying(false); }
    } else {
      setPlaying((p) => !p);
    }
  }, [direct]);

  const seek = useCallback((delta: number) => {
    if (direct && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    } else {
      setProgress((p) => Math.max(0, Math.min(duration, p + delta)));
    }
  }, [direct, duration]);

  const toggleMute = () => {
    if (direct && videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    } else setMuted((m) => !m);
  };

  const toggleCaptions = () => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    const next = !captionsOn;
    for (let i = 0; i < tracks.length; i++) tracks[i].mode = next ? "showing" : "hidden";
    setCaptionsOn(next);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  // Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key.toLowerCase()) {
      case " ":
      case "k": e.preventDefault(); toggle(); break;
      case "arrowleft": e.preventDefault(); seek(-5); break;
      case "arrowright": e.preventDefault(); seek(5); break;
      case "m": e.preventDefault(); toggleMute(); break;
      case "f": e.preventDefault(); toggleFullscreen(); break;
      case "c": if (hasCaptions) { e.preventDefault(); toggleCaptions(); } break;
    }
  };

  const pct = duration > 0 ? Math.min(100, Math.round((progress / duration) * 100)) : 0;
  const ready = pct >= 90;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        role="region"
        aria-label={`Lesson video: ${title}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative rounded-xl overflow-hidden bg-[#0f172a] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e3a5f]">
          {direct && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || SIM_DURATION)}
              crossOrigin="anonymous"
              playsInline
            >
              {hasCaptions && vttUrl && (
                <track kind="captions" src={vttUrl} srcLang="en" label="English" default={false} />
              )}
            </video>
          )}
          {!direct && (
            <div className="text-center px-4 z-10">
              <div className="text-xs text-slate-400 mb-2">Lesson Video</div>
              <div className="text-base font-semibold text-white max-w-xs line-clamp-2">{title}</div>
            </div>
          )}

          <button
            onClick={toggle}
            aria-label={playing ? "Pause video" : "Play video"}
            aria-pressed={playing}
            className="absolute z-20 w-14 h-14 rounded-full flex items-center justify-center bg-primary/95 hover:bg-primary text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={playing ? { background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" } : undefined}
          >
            {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
          </button>

          {resumed && progress > 5 && pct < 90 && (
            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-semibold px-2 py-1 rounded">
              Resumed at {formatTime(progress)}
            </div>
          )}

          <div className="absolute bottom-2 right-2 z-10 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            {formatTime(progress)} / {formatTime(duration)}
          </div>
        </div>

        {/* Controls bar */}
        <div className="bg-[#1e293b] px-3 py-2.5">
          <div
            role="progressbar"
            aria-label="Watch progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1 rounded-full bg-[#334155] overflow-hidden mb-2"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: ready
                  ? "linear-gradient(90deg, hsl(var(--dlh-success)), hsl(142 76% 50%))"
                  : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute (M)" : "Mute (M)"}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {hasCaptions && (
                <button
                  onClick={toggleCaptions}
                  aria-label={captionsOn ? "Hide captions (C)" : "Show captions (C)"}
                  aria-pressed={captionsOn}
                  className={`p-1 rounded hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${captionsOn ? "text-primary" : "text-slate-300 hover:text-white"}`}
                >
                  <Captions size={14} />
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                aria-label="Fullscreen (F)"
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Maximize size={14} />
              </button>
              <span className="text-slate-400 ml-1">{pct}% watched</span>
            </div>
            <div>
              {ready && !isCompleted && <span className="text-emerald-400 font-semibold">✓ Ready to complete</span>}
              {ready && isCompleted && (
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-400">
                  <CheckCircle size={10} /> Completed
                </Badge>
              )}
              {!ready && <span className="text-slate-500">Watch 90% to complete</span>}
            </div>
          </div>
          <div className="sr-only" aria-live="polite">
            {ready ? "Lesson ready to complete." : `Progress ${pct} percent.`}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Keyboard: Space/K play, ← → seek 5s, M mute, F fullscreen{hasCaptions ? ", C captions" : ""}.
      </p>

      {transcript && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
          >
            <FileText size={14} />
            Transcript
            {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          {showTranscript && (
            <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
