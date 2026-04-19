import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  filePath: string;
  fileName: string;
  mimeType: string | null;
}

export default function FilePreview({ filePath, fileName, mimeType }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isImage = mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(fileName);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("classroom-files")
          .createSignedUrl(filePath, 300);
        if (error || !data) throw error;
        if (cancelled) return;

        if (isImage) {
          setPreviewUrl(data.signedUrl);
          setLoading(false);
        } else if (isPdf) {
          const loadingTask = pdfjsLib.getDocument(data.signedUrl);
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (!cancelled) setLoading(false);
        } else {
          setFailed(true);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [filePath, isImage, isPdf]);

  if (!isImage && !isPdf) {
    return (
      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <FileText className="text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
      {loading && <Loader2 className="animate-spin text-muted-foreground" size={16} />}
      {failed && !loading && <FileText className="text-muted-foreground" size={20} />}
      {isImage && previewUrl && !failed && (
        <img
          src={previewUrl}
          alt={fileName}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
          onLoad={() => setLoading(false)}
        />
      )}
      {isPdf && !failed && (
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${loading ? "hidden" : ""}`} />
      )}
    </div>
  );
}
