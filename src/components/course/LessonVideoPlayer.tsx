import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";

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
const SIM_DURATION = 240; // 4 minutes simulated for non-direct videos

export function LessonVideoPlayer({
  lessonId,
  videoUrl,
  title,
  transcript,
  isCompleted,
  onAutoComplete,
}: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(SIM_DURATION);
  const [playing, setPlaying] = useState(false);
  const hasAutoCompleted = useRef(isCompleted);
  const direct = isDirectVideo(videoUrl);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    hasAutoCompleted.current = isCompleted;
  }, [isCompleted]);

  const checkComplete = useCallback(
    (current: number, total: number) => {
      if (total > 0 && current / total >= THRESHOLD && !hasAutoCompleted.current) {
        hasAutoCompleted.current = true;
        onAutoComplete(lessonId);
      }
    },
    [lessonId, onAutoComplete]
  );

  // Simulated tick for non-direct sources
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
        if (next >= duration) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, direct, duration, checkComplete]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime);
    setDuration(v.duration);
    checkComplete(v.currentTime, v.duration);
  };

  const toggle = () => {
    if (direct && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setPlaying(true);
      } else {
        videoRef.current.pause();
        setPlaying(false);
      }
    } else {
      setPlaying((p) => !p);
    }
  };

  const pct = duration > 0 ? Math.min(100, Math.round((progress / duration) * 100)) : 0;
  const ready = pct >= 90;

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-[#0f172a]">
        {/* Stage */}
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
              playsInline
            />
          )}
          {!direct && (
            <div className="text-center px-4 z-10">
              <div className="text-xs text-slate-400 mb-2">Lesson Video</div>
              <div className="text-base font-semibold text-white max-w-xs line-clamp-2">
                {title}
              </div>
            </div>
          )}

          {/* Play/Pause overlay */}
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="absolute z-20 w-14 h-14 rounded-full flex items-center justify-center bg-primary/95 hover:bg-primary text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all backdrop-blur-sm"
            style={playing ? { background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" } : undefined}
          >
            {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
          </button>

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 z-10 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            {formatTime(progress)} / {formatTime(duration)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-[#1e293b] px-4 py-2.5">
          <div className="h-1 rounded-full bg-[#334155] overflow-hidden mb-1.5">
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
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{pct}% watched</span>
            {ready && !isCompleted && (
              <span className="text-emerald-400 font-semibold">✓ Ready to complete</span>
            )}
            {ready && isCompleted && (
              <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-400">
                <CheckCircle size={10} /> Completed
              </Badge>
            )}
            {!ready && <span className="text-slate-500">Watch 90% to complete</span>}
          </div>
        </div>
      </div>

      {transcript && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShowTranscript(!showTranscript)}
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
