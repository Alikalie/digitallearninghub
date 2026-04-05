import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Sparkles, Download, Trash2, Image as ImageIcon, Wand2, AlertTriangle,
} from "lucide-react";

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;
const RATE_LIMIT = 2;
const RATE_WINDOW_HOURS = 48;

export default function ImageGenerator() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [remainingGenerations, setRemainingGenerations] = useState(RATE_LIMIT);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadImages();
      checkRateLimit();
    }
  }, [user]);

  const checkRateLimit = async () => {
    if (!user) return;
    const cutoff = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("image_generation_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", cutoff);
    setRemainingGenerations(Math.max(0, RATE_LIMIT - (count || 0)));
  };

  const loadImages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_images")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setImages(data);
    setLoading(false);
  };

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating || !user) return;

    if (remainingGenerations <= 0) {
      setShowLimitDialog(true);
      return;
    }

    setIsGenerating(true);
    setCurrentImage(null);

    try {
      const response = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate image");
      if (!data.imageUrl) throw new Error("No image was generated");

      setCurrentImage(data.imageUrl);

      // Save to generated_images
      const { data: savedImage } = await supabase
        .from("generated_images")
        .insert({ user_id: user.id, prompt: prompt.trim(), image_url: data.imageUrl })
        .select()
        .single();

      if (savedImage) setImages((prev) => [savedImage, ...prev]);

      // Log for rate limiting
      await supabase.from("image_generation_log").insert({ user_id: user.id });

      setRemainingGenerations((prev) => Math.max(0, prev - 1));
      toast.success("Image generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (imageUrl: string, promptText: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `dlh-${promptText.slice(0, 20).replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image download started");
  };

  const deleteImage = async (imageId: string) => {
    const { error } = await supabase.from("generated_images").delete().eq("id", imageId);
    if (error) { toast.error("Failed to delete image"); return; }
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.success("Image deleted");
  };

  const suggestions = [
    "A colorful diagram of the solar system",
    "An educational infographic about the water cycle",
    "A cute cartoon mascot for a math class",
    "A vibrant illustration of DNA structure",
    "A friendly robot teacher in a classroom",
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Image Generator</h1>
          <p className="text-muted-foreground">Create stunning visuals from text descriptions using AI</p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm">
            <Sparkles size={14} className="text-primary" />
            <span className="font-medium">{remainingGenerations}/{RATE_LIMIT}</span>
            <span className="text-muted-foreground">generations remaining (resets every 48h)</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="dlh-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Wand2 className="text-primary" size={20} /> Create New Image
              </h2>
              <div className="space-y-4">
                <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image you want to create..." onKeyDown={(e) => e.key === "Enter" && generateImage()} />
                <Button onClick={generateImage} disabled={!prompt.trim() || isGenerating || remainingGenerations <= 0} className="w-full bg-gradient-primary hover:opacity-90">
                  {isGenerating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>) : (<><Sparkles className="mr-2 h-4 w-4" />Generate Image</>)}
                </Button>
              </div>
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">Try these suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setPrompt(s)} className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="dlh-card p-6">
              <h2 className="font-semibold mb-4">Preview</h2>
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {isGenerating ? (
                  <div className="text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" /><p className="text-muted-foreground">Creating your image...</p></div>
                ) : currentImage ? (
                  <div className="relative w-full h-full group">
                    <img src={currentImage} alt="Generated" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" onClick={() => downloadImage(currentImage, prompt)}><Download className="mr-2 h-4 w-4" />Download</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground"><ImageIcon size={48} className="mx-auto mb-4 opacity-50" /><p>Your generated image will appear here</p></div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dlh-card p-6">
            <h2 className="font-semibold mb-4">Your Gallery</h2>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image) => (
                    <motion.div key={image.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={image.image_url} alt={image.prompt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs truncate mb-2">{image.prompt}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => downloadImage(image.image_url, image.prompt)}><Download size={12} /></Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteImage(image.id)}><Trash2 size={12} /></Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><ImageIcon className="mx-auto mb-4 text-muted-foreground" size={48} /><p className="text-muted-foreground">No images yet</p></div>
              )}
            </ScrollArea>
          </motion.div>
        </div>
      </div>

      {/* Rate Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="text-destructive" size={32} />
            </div>
            <DialogTitle>Generation Limit Reached</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            You've used all {RATE_LIMIT} free image generations for the past {RATE_WINDOW_HOURS} hours.
          </p>
          <p className="text-sm font-medium">
            Contact admin to request additional generations or wait for the limit to reset.
          </p>
          <p className="text-xs text-muted-foreground">
            Email: digitallearninghub0@gmail.com
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowLimitDialog(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
