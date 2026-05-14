import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Plus, Trash2, GripVertical, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import IconSelector from "@/components/admin/IconSelector";

interface HeroContent {
  subtitle: string;
  headline: string;
  highlight: string;
  tagline: string;
  video_url: string;
}

interface ValueCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface WhyAsasContent {
  subtitle: string;
  title: string;
  description: string;
  mission: string;
  mission_author: string;
}

interface StatItem {
  id: string;
  value: string;
  label: string;
}

interface ContentState {
  hero_en: HeroContent;
  hero_ar: HeroContent;
  why_asas_en: WhyAsasContent;
  why_asas_ar: WhyAsasContent;
  why_asas_values_en: ValueCard[];
  why_asas_values_ar: ValueCard[];
  stats_en: StatItem[];
  stats_ar: StatItem[];
}

const defaultHero: HeroContent = {
  subtitle: "",
  headline: "",
  highlight: "",
  tagline: "",
  video_url: "",
};

const defaultWhyAsas: WhyAsasContent = {
  subtitle: "",
  title: "",
  description: "",
  mission: "",
  mission_author: "",
};

function SortableValueCard({
  card,
  onUpdate,
  onDelete,
  lang,
}: {
  card: ValueCard;
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  lang: "en" | "ar";
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg"
    >
      <button {...attributes} {...listeners} className="mt-3 cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1 space-y-3">
        <div className="flex gap-3">
          <div className="w-24">
            <Label className="text-xs">Icon</Label>
            <IconSelector
              value={card.icon}
              onChange={(icon) => onUpdate(card.id, "icon", icon)}
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={card.title}
              onChange={(e) => onUpdate(card.id, "title", e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={card.description}
            onChange={(e) => onUpdate(card.id, "description", e.target.value)}
            rows={2}
            dir={lang === "ar" ? "rtl" : "ltr"}
          />
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(card.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function SortableStatItem({
  stat,
  onUpdate,
  onDelete,
  lang,
}: {
  stat: StatItem;
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  lang: "en" | "ar";
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: stat.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="w-24">
        <Input
          value={stat.value}
          onChange={(e) => onUpdate(stat.id, "value", e.target.value)}
          placeholder="100+"
        />
      </div>
      <div className="flex-1">
        <Input
          value={stat.label}
          onChange={(e) => onUpdate(stat.id, "label", e.target.value)}
          placeholder={lang === "ar" ? "الوصف" : "Label"}
          dir={lang === "ar" ? "rtl" : "ltr"}
        />
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(stat.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function AdminHomeContent() {
  const [content, setContent] = useState<ContentState>({
    hero_en: defaultHero,
    hero_ar: defaultHero,
    why_asas_en: defaultWhyAsas,
    why_asas_ar: defaultWhyAsas,
    why_asas_values_en: [],
    why_asas_values_ar: [],
    stats_en: [],
    stats_ar: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchContent();
  }, []);

  async function fetchContent() {
    const { data, error } = await supabase
      .from("pages_content")
      .select("*")
      .eq("page_slug", "home");

    if (error) {
      toast.error("Failed to load content");
      setIsLoading(false);
      return;
    }

    const newContent = { ...content };
    
    data?.forEach((row) => {
      const contentEn = row.content_en as Record<string, any>;
      const contentAr = row.content_ar as Record<string, any>;

      if (row.section_key === "hero") {
        newContent.hero_en = { ...defaultHero, ...contentEn };
        newContent.hero_ar = { ...defaultHero, ...contentAr };
      } else if (row.section_key === "why_asas") {
        newContent.why_asas_en = { ...defaultWhyAsas, ...contentEn };
        newContent.why_asas_ar = { ...defaultWhyAsas, ...contentAr };
      } else if (row.section_key === "why_asas_values") {
        newContent.why_asas_values_en = Array.isArray(contentEn) ? contentEn : [];
        newContent.why_asas_values_ar = Array.isArray(contentAr) ? contentAr : [];
      } else if (row.section_key === "stats") {
        newContent.stats_en = Array.isArray(contentEn) ? contentEn : [];
        newContent.stats_ar = Array.isArray(contentAr) ? contentAr : [];
      }
    });

    setContent(newContent);
    setIsLoading(false);
  }

  async function handleSave() {
    setIsSaving(true);

    const sections = [
      { key: "hero", en: content.hero_en, ar: content.hero_ar },
      { key: "why_asas", en: content.why_asas_en, ar: content.why_asas_ar },
      { key: "why_asas_values", en: content.why_asas_values_en, ar: content.why_asas_values_ar },
      { key: "stats", en: content.stats_en, ar: content.stats_ar },
    ];

    try {
      for (const section of sections) {
        // Check if record exists
        const { data: existing } = await supabase
          .from("pages_content")
          .select("id")
          .eq("page_slug", "home")
          .eq("section_key", section.key)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("pages_content")
            .update({
              content_en: section.en as any,
              content_ar: section.ar as any,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("pages_content")
            .insert({
              page_slug: "home",
              section_key: section.key,
              content_en: section.en as any,
              content_ar: section.ar as any,
            });
          if (error) throw error;
        }
      }
      toast.success("Content saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save content");
    } finally {
      setIsSaving(false);
    }
  }

  function updateHero(lang: "en" | "ar", field: keyof HeroContent, value: string) {
    setContent((prev) => ({
      ...prev,
      [`hero_${lang}`]: { ...prev[`hero_${lang}`], [field]: value },
    }));
  }

  function updateWhyAsas(lang: "en" | "ar", field: keyof WhyAsasContent, value: string) {
    setContent((prev) => ({
      ...prev,
      [`why_asas_${lang}`]: { ...prev[`why_asas_${lang}`], [field]: value },
    }));
  }

  function addValueCard(lang: "en" | "ar") {
    const key = `why_asas_values_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] as ValueCard[]),
        { id: crypto.randomUUID(), icon: "star", title: "", description: "" },
      ],
    }));
  }

  function updateValueCard(lang: "en" | "ar", id: string, field: string, value: string) {
    const key = `why_asas_values_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: (prev[key] as ValueCard[]).map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      ),
    }));
  }

  function deleteValueCard(lang: "en" | "ar", id: string) {
    const key = `why_asas_values_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: (prev[key] as ValueCard[]).filter((card) => card.id !== id),
    }));
  }

  function handleValueCardDragEnd(lang: "en" | "ar", event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const key = `why_asas_values_${lang}` as keyof ContentState;
    setContent((prev) => {
      const items = prev[key] as ValueCard[];
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return {
        ...prev,
        [key]: arrayMove(items, oldIndex, newIndex),
      };
    });
  }

  function addStat(lang: "en" | "ar") {
    const key = `stats_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] as StatItem[]),
        { id: crypto.randomUUID(), value: "", label: "" },
      ],
    }));
  }

  function updateStat(lang: "en" | "ar", id: string, field: string, value: string) {
    const key = `stats_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: (prev[key] as StatItem[]).map((stat) =>
        stat.id === id ? { ...stat, [field]: value } : stat
      ),
    }));
  }

  function deleteStat(lang: "en" | "ar", id: string) {
    const key = `stats_${lang}` as keyof ContentState;
    setContent((prev) => ({
      ...prev,
      [key]: (prev[key] as StatItem[]).filter((stat) => stat.id !== id),
    }));
  }

  function handleStatDragEnd(lang: "en" | "ar", event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const key = `stats_${lang}` as keyof ContentState;
    setContent((prev) => {
      const items = prev[key] as StatItem[];
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return {
        ...prev,
        [key]: arrayMove(items, oldIndex, newIndex),
      };
    });
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileName = `hero/hero-video-${Date.now()}.mp4`;
    
    const { error } = await supabase.storage
      .from("site-assets")
      .upload(fileName, file, { contentType: "video/mp4" });

    if (error) {
      toast.error("Failed to upload video");
    } else {
      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);
      updateHero("en", "video_url", urlData.publicUrl);
      updateHero("ar", "video_url", urlData.publicUrl);
      toast.success("Video uploaded");
    }
    setIsUploading(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Home Page Content</h1>
          <p className="text-muted-foreground mt-1">
            Manage hero, values, and statistics sections
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="me-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="why-asas">Why Asas</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hero Video</CardTitle>
              <CardDescription>
                Background video for the hero section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {content.hero_en.video_url ? (
                  <div className="relative flex-1">
                    <video
                      src={content.hero_en.video_url}
                      className="w-full h-40 object-cover rounded-lg"
                      muted
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 end-2 h-8 w-8"
                      onClick={() => {
                        updateHero("en", "video_url", "");
                        updateHero("ar", "video_url", "");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex-1 flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload MP4 video
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/mp4"
                      className="hidden"
                      onChange={handleVideoUpload}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hero Headlines</CardTitle>
              <CardDescription>
                Main text content for the hero section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtitle (EN)</Label>
                  <Input
                    value={content.hero_en.subtitle}
                    onChange={(e) => updateHero("en", "subtitle", e.target.value)}
                    placeholder="e.g., Dubai's Premier"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (AR)</Label>
                  <Input
                    value={content.hero_ar.subtitle}
                    onChange={(e) => updateHero("ar", "subtitle", e.target.value)}
                    placeholder="العنوان الفرعي"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Headline (EN)</Label>
                  <Input
                    value={content.hero_en.headline}
                    onChange={(e) => updateHero("en", "headline", e.target.value)}
                    placeholder="Main headline"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Headline (AR)</Label>
                  <Input
                    value={content.hero_ar.headline}
                    onChange={(e) => updateHero("ar", "headline", e.target.value)}
                    placeholder="العنوان الرئيسي"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Highlight Word (EN)</Label>
                  <Input
                    value={content.hero_en.highlight}
                    onChange={(e) => updateHero("en", "highlight", e.target.value)}
                    placeholder="e.g., Extraordinary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highlight Word (AR)</Label>
                  <Input
                    value={content.hero_ar.highlight}
                    onChange={(e) => updateHero("ar", "highlight", e.target.value)}
                    placeholder="الكلمة المميزة"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tagline (EN)</Label>
                  <Textarea
                    value={content.hero_en.tagline}
                    onChange={(e) => updateHero("en", "tagline", e.target.value)}
                    placeholder="Supporting tagline..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline (AR)</Label>
                  <Textarea
                    value={content.hero_ar.tagline}
                    onChange={(e) => updateHero("ar", "tagline", e.target.value)}
                    placeholder="الشعار الداعم..."
                    rows={2}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Why Asas Section */}
        <TabsContent value="why-asas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtitle (EN)</Label>
                  <Input
                    value={content.why_asas_en.subtitle}
                    onChange={(e) => updateWhyAsas("en", "subtitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (AR)</Label>
                  <Input
                    value={content.why_asas_ar.subtitle}
                    onChange={(e) => updateWhyAsas("ar", "subtitle", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (EN)</Label>
                  <Input
                    value={content.why_asas_en.title}
                    onChange={(e) => updateWhyAsas("en", "title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (AR)</Label>
                  <Input
                    value={content.why_asas_ar.title}
                    onChange={(e) => updateWhyAsas("ar", "title", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description (EN)</Label>
                  <Textarea
                    value={content.why_asas_en.description}
                    onChange={(e) => updateWhyAsas("en", "description", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (AR)</Label>
                  <Textarea
                    value={content.why_asas_ar.description}
                    onChange={(e) => updateWhyAsas("ar", "description", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value Cards (English)</CardTitle>
              <CardDescription>
                Features and benefits displayed in the Why Asas section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleValueCardDragEnd("en", e)}
              >
                <SortableContext
                  items={content.why_asas_values_en.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {content.why_asas_values_en.map((card) => (
                    <SortableValueCard
                      key={card.id}
                      card={card}
                      onUpdate={(id, field, value) => updateValueCard("en", id, field, value)}
                      onDelete={(id) => deleteValueCard("en", id)}
                      lang="en"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addValueCard("en")}>
                <Plus className="me-2 h-4 w-4" />
                Add Value Card
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value Cards (Arabic)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleValueCardDragEnd("ar", e)}
              >
                <SortableContext
                  items={content.why_asas_values_ar.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {content.why_asas_values_ar.map((card) => (
                    <SortableValueCard
                      key={card.id}
                      card={card}
                      onUpdate={(id, field, value) => updateValueCard("ar", id, field, value)}
                      onDelete={(id) => deleteValueCard("ar", id)}
                      lang="ar"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addValueCard("ar")}>
                <Plus className="me-2 h-4 w-4" />
                Add Value Card
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mission Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mission (EN)</Label>
                  <Textarea
                    value={content.why_asas_en.mission}
                    onChange={(e) => updateWhyAsas("en", "mission", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mission (AR)</Label>
                  <Textarea
                    value={content.why_asas_ar.mission}
                    onChange={(e) => updateWhyAsas("ar", "mission", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Author (EN)</Label>
                  <Input
                    value={content.why_asas_en.mission_author}
                    onChange={(e) => updateWhyAsas("en", "mission_author", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author (AR)</Label>
                  <Input
                    value={content.why_asas_ar.mission_author}
                    onChange={(e) => updateWhyAsas("ar", "mission_author", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Section */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics (English)</CardTitle>
              <CardDescription>
                Key metrics displayed on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleStatDragEnd("en", e)}
              >
                <SortableContext
                  items={content.stats_en.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {content.stats_en.map((stat) => (
                    <SortableStatItem
                      key={stat.id}
                      stat={stat}
                      onUpdate={(id, field, value) => updateStat("en", id, field, value)}
                      onDelete={(id) => deleteStat("en", id)}
                      lang="en"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addStat("en")}>
                <Plus className="me-2 h-4 w-4" />
                Add Statistic
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics (Arabic)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleStatDragEnd("ar", e)}
              >
                <SortableContext
                  items={content.stats_ar.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {content.stats_ar.map((stat) => (
                    <SortableStatItem
                      key={stat.id}
                      stat={stat}
                      onUpdate={(id, field, value) => updateStat("ar", id, field, value)}
                      onDelete={(id) => deleteStat("ar", id)}
                      lang="ar"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addStat("ar")}>
                <Plus className="me-2 h-4 w-4" />
                Add Statistic
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
