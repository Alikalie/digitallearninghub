import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  title: string;
  questions: FAQItem[];
}

export function FAQManagementTab() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFAQ();
  }, []);

  const loadFAQ = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "faq_data")
      .single();

    if (data?.value) {
      setCategories(data.value as unknown as FAQCategory[]);
    } else {
      // Default categories
      setCategories([
        { id: "platform", title: "Platform & Account", questions: [{ q: "What is Digital Learning Hub?", a: "DLH is an AI-powered education platform." }] },
        { id: "courses", title: "Courses & Learning", questions: [{ q: "What courses are available?", a: "DLH offers 70+ courses across various categories." }] },
        { id: "ai", title: "AI Features", questions: [{ q: "How does the AI tutor work?", a: "The AI uses advanced models to provide personalized explanations." }] },
        { id: "privacy", title: "Privacy & Security", questions: [{ q: "Is my data safe?", a: "Yes, we use industry-standard encryption." }] },
      ]);
    }
    setLoading(false);
  };

  const saveFAQ = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key: "faq_data", value: categories as any }, { onConflict: "key" });

    if (error) {
      toast.error("Failed to save FAQ");
    } else {
      toast.success("FAQ saved successfully");
    }
    setSaving(false);
  };

  const addCategory = () => {
    setCategories(prev => [...prev, { id: `cat-${Date.now()}`, title: "New Category", questions: [] }]);
  };

  const removeCategory = (idx: number) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCategoryTitle = (idx: number, title: string) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, title } : c));
  };

  const addQuestion = (catIdx: number) => {
    setCategories(prev => prev.map((c, i) => i === catIdx ? { ...c, questions: [...c.questions, { q: "", a: "" }] } : c));
  };

  const removeQuestion = (catIdx: number, qIdx: number) => {
    setCategories(prev => prev.map((c, i) => i === catIdx ? { ...c, questions: c.questions.filter((_, j) => j !== qIdx) } : c));
  };

  const updateQuestion = (catIdx: number, qIdx: number, field: "q" | "a", value: string) => {
    setCategories(prev => prev.map((c, i) =>
      i === catIdx ? { ...c, questions: c.questions.map((q, j) => j === qIdx ? { ...q, [field]: value } : q) } : c
    ));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FAQ Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addCategory}><Plus className="mr-1 h-4 w-4" />Add Category</Button>
          <Button size="sm" onClick={saveFAQ} disabled={saving} className="bg-gradient-primary">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save All
          </Button>
        </div>
      </div>

      {categories.map((cat, catIdx) => (
        <div key={cat.id} className="dlh-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={cat.title}
              onChange={(e) => updateCategoryTitle(catIdx, e.target.value)}
              className="font-semibold text-base"
              placeholder="Category title"
            />
            <Button variant="ghost" size="sm" className="text-destructive flex-shrink-0" onClick={() => removeCategory(catIdx)}>
              <Trash2 size={16} />
            </Button>
          </div>

          {cat.questions.map((faq, qIdx) => (
            <div key={qIdx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Question</Label>
                    <Input value={faq.q} onChange={(e) => updateQuestion(catIdx, qIdx, "q", e.target.value)} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Answer</Label>
                    <Textarea value={faq.a} onChange={(e) => updateQuestion(catIdx, qIdx, "a", e.target.value)} className="mt-1 text-sm" rows={2} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive mt-5" onClick={() => removeQuestion(catIdx, qIdx)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={() => addQuestion(catIdx)}>
            <Plus className="mr-1 h-3 w-3" />Add Question
          </Button>
        </div>
      ))}
    </div>
  );
}
