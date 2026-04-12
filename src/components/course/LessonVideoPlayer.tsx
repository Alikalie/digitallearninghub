import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface LessonVideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
  transcript?: string | null;
  isCompleted: boolean;
  onAutoComplete: (lessonId: string) => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId = "";
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v") || "";
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=0&enablejsapi=1&origin=${window.location.origin}`;
  } catch {
    return null;
  }
}

export function LessonVideoPlayer({
  lessonId,
  videoUrl,
  title,
  transcript,
  isCompleted,
  onAutoComplete,
}: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const hasAutoCompleted = useRef(false);

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const isYouTube = !!embedUrl;

  // Local video: track timeupdate for 90% auto-complete
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.duration === 0) return;
    const progress = (video.currentTime / video.duration) * 100;
    setWatchProgress(Math.round(progress));
    if (progress >= 90 && !hasAutoCompleted.current && !isCompleted) {
      hasAutoCompleted.current = true;
      onAutoComplete(lessonId);
    }
  }, [lessonId, isCompleted, onAutoComplete]);

  // YouTube: poll via postMessage API
  useEffect(() => {
    if (!isYouTube || isCompleted) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "infoDelivery" && data.info?.currentTime && data.info?.duration) {
          const progress = (data.info.currentTime / data.info.duration) * 100;
          setWatchProgress(Math.round(progress));
          if (progress >= 90 && !hasAutoCompleted.current) {
            hasAutoCompleted.current = true;
            onAutoComplete(lessonId);
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);

    // Start listening to YouTube player events
    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening" }),
          "https://www.youtube.com"
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [isYouTube, lessonId, isCompleted, onAutoComplete]);

  useEffect(() => {
    hasAutoCompleted.current = isCompleted;
  }, [isCompleted]);

  return (
    <div className="space-y-2">
      {isYouTube ? (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted relative">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}

      {/* Progress indicator */}
      {!isCompleted && watchProgress > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{watchProgress}%</span>
          {watchProgress >= 90 && (
            <Badge variant="outline" className="text-xs gap-1">
              <CheckCircle size={10} /> Auto-completed
            </Badge>
          )}
        </div>
      )}

      {/* Transcript */}
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
