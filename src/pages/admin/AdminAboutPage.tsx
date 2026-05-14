import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";

export default function AdminAboutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ["page_sections", "about"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("*")
        .eq("page_slug", "about")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (section: { id: string; title_en: string; title_ar: string; content_en: string; content_ar: string }) => {
      const { error } = await supabase
        .from("page_sections")
        .update({
          title_en: section.title_en,
          title_ar: section.title_ar,
          content_en: section.content_en,
          content_ar: section.content_ar,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_sections", "about"] });
      toast({ title: "Saved", description: "Section updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">About Page</h1>
        <p className="text-muted-foreground">Manage the About page content sections.</p>
      </div>

      {sections?.map((section) => (
        <SectionEditor key={section.id} section={section} onSave={(s) => updateMutation.mutate(s)} saving={updateMutation.isPending} />
      ))}
    </div>
  );
}

function SectionEditor({ section, onSave, saving }: { section: any; onSave: (s: any) => void; saving: boolean }) {
  const [titleEn, setTitleEn] = useState(section.title_en || "");
  const [titleAr, setTitleAr] = useState(section.title_ar || "");
  const [contentEn, setContentEn] = useState(section.content_en || "");
  const [contentAr, setContentAr] = useState(section.content_ar || "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{section.section_key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Title (English)</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title (Arabic)</Label>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Content (English)</Label>
            <Textarea value={contentEn} onChange={(e) => setContentEn(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Content (Arabic)</Label>
            <Textarea value={contentAr} onChange={(e) => setContentAr(e.target.value)} rows={4} dir="rtl" />
          </div>
        </div>
        <Button
          onClick={() => onSave({ id: section.id, title_en: titleEn, title_ar: titleAr, content_en: contentEn, content_ar: contentAr })}
          disabled={saving}
          size="sm"
        >
          <Save className="h-4 w-4 me-2" />
          Save Section
        </Button>
      </CardContent>
    </Card>
  );
}
