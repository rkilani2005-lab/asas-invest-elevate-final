import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2, Eye, Upload, X } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface InsightData {
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en: string;
  content_ar: string;
  category: string;
  featured_image: string;
  author_en: string;
  author_ar: string;
  read_time_minutes: number;
  is_featured: boolean;
  is_published: boolean;
  meta_title_en: string;
  meta_title_ar: string;
  meta_description_en: string;
  meta_description_ar: string;
}

const defaultData: InsightData = {
  slug: "",
  title_en: "",
  title_ar: "",
  excerpt_en: "",
  excerpt_ar: "",
  content_en: "",
  content_ar: "",
  category: "market_news",
  featured_image: "",
  author_en: "",
  author_ar: "",
  read_time_minutes: 5,
  is_featured: false,
  is_published: false,
  meta_title_en: "",
  meta_title_ar: "",
  meta_description_en: "",
  meta_description_ar: "",
};

const categories = [
  { value: "market_news", label: "Market News" },
  { value: "project_updates", label: "Project Updates" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "investment_guide", label: "Investment Guide" },
];

export default function InsightEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [data, setData] = useState<InsightData>(defaultData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInsight();
    }
  }, [id]);

  async function fetchInsight() {
    setIsLoading(true);
    const { data: insight, error } = await supabase
      .from("insights")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to load insight");
      navigate("/admin/insights");
    } else if (insight) {
      setData({
        slug: insight.slug || "",
        title_en: insight.title_en || "",
        title_ar: insight.title_ar || "",
        excerpt_en: insight.excerpt_en || "",
        excerpt_ar: insight.excerpt_ar || "",
        content_en: insight.content_en || "",
        content_ar: insight.content_ar || "",
        category: insight.category || "market_news",
        featured_image: insight.featured_image || "",
        author_en: insight.author_en || "",
        author_ar: insight.author_ar || "",
        read_time_minutes: insight.read_time_minutes || 5,
        is_featured: insight.is_featured || false,
        is_published: insight.is_published || false,
        meta_title_en: insight.meta_title_en || "",
        meta_title_ar: insight.meta_title_ar || "",
        meta_description_en: insight.meta_description_en || "",
        meta_description_ar: insight.meta_description_ar || "",
      });
    }
    setIsLoading(false);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function updateField(field: keyof InsightData, value: any) {
    setData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title
      if (field === "title_en" && !isEditing) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileName = `insights/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error } = await supabase.storage
      .from("site-assets")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload image");
    } else {
      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);
      updateField("featured_image", urlData.publicUrl);
      toast.success("Image uploaded");
    }
    setIsUploading(false);
  }

  async function handleSave(publish: boolean = false) {
    if (!data.title_en || !data.slug) {
      toast.error("Title and slug are required");
      return;
    }

    setIsSaving(true);

    const payload = {
      ...data,
      is_published: publish ? true : data.is_published,
      published_at: publish && !data.is_published ? new Date().toISOString() : undefined,
    };

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from("insights")
        .update(payload)
        .eq("id", id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("insights")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      toast.error(error.message || "Failed to save");
    } else {
      toast.success(publish ? "Article published!" : "Article saved");
      navigate("/admin/insights");
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/insights")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Edit Article" : "New Article"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEditing ? "Update your article content" : "Create a new blog post or news article"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Eye className="me-2 h-4 w-4" />}
            {data.is_published ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title_en">Title (English) *</Label>
                  <Input
                    id="title_en"
                    value={data.title_en}
                    onChange={(e) => updateField("title_en", e.target.value)}
                    placeholder="Article title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title_ar">Title (Arabic)</Label>
                  <Input
                    id="title_ar"
                    value={data.title_ar}
                    onChange={(e) => updateField("title_ar", e.target.value)}
                    placeholder="عنوان المقال"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={data.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="article-url-slug"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="excerpt_en">Excerpt (English)</Label>
                  <Textarea
                    id="excerpt_en"
                    value={data.excerpt_en}
                    onChange={(e) => updateField("excerpt_en", e.target.value)}
                    placeholder="Brief summary..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excerpt_ar">Excerpt (Arabic)</Label>
                  <Textarea
                    id="excerpt_ar"
                    value={data.excerpt_ar}
                    onChange={(e) => updateField("excerpt_ar", e.target.value)}
                    placeholder="ملخص موجز..."
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="en" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <RichTextEditor
                    content={data.content_en}
                    onChange={(content) => updateField("content_en", content)}
                    placeholder="Write your article content..."
                  />
                </TabsContent>
                <TabsContent value="ar">
                  <RichTextEditor
                    content={data.content_ar}
                    onChange={(content) => updateField("content_ar", content)}
                    placeholder="اكتب محتوى المقال..."
                    dir="rtl"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title_en">Meta Title (EN)</Label>
                  <Input
                    id="meta_title_en"
                    value={data.meta_title_en}
                    onChange={(e) => updateField("meta_title_en", e.target.value)}
                    placeholder="SEO title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_title_ar">Meta Title (AR)</Label>
                  <Input
                    id="meta_title_ar"
                    value={data.meta_title_ar}
                    onChange={(e) => updateField("meta_title_ar", e.target.value)}
                    placeholder="عنوان SEO"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_description_en">Meta Description (EN)</Label>
                  <Textarea
                    id="meta_description_en"
                    value={data.meta_description_en}
                    onChange={(e) => updateField("meta_description_en", e.target.value)}
                    placeholder="SEO description..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_description_ar">Meta Description (AR)</Label>
                  <Textarea
                    id="meta_description_ar"
                    value={data.meta_description_ar}
                    onChange={(e) => updateField("meta_description_ar", e.target.value)}
                    placeholder="وصف SEO..."
                    rows={2}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              {data.featured_image ? (
                <div className="relative">
                  <img
                    src={data.featured_image}
                    alt="Featured"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 end-2 h-8 w-8"
                    onClick={() => updateField("featured_image", "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={data.category}
                  onValueChange={(value) => updateField("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author_en">Author (EN)</Label>
                  <Input
                    id="author_en"
                    value={data.author_en}
                    onChange={(e) => updateField("author_en", e.target.value)}
                    placeholder="Author name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author_ar">Author (AR)</Label>
                  <Input
                    id="author_ar"
                    value={data.author_ar}
                    onChange={(e) => updateField("author_ar", e.target.value)}
                    placeholder="اسم الكاتب"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="read_time">Read Time (minutes)</Label>
                <Input
                  id="read_time"
                  type="number"
                  min={1}
                  value={data.read_time_minutes}
                  onChange={(e) => updateField("read_time_minutes", parseInt(e.target.value) || 5)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_featured">Featured Article</Label>
                <Switch
                  id="is_featured"
                  checked={data.is_featured}
                  onCheckedChange={(checked) => updateField("is_featured", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_published">Published</Label>
                <Switch
                  id="is_published"
                  checked={data.is_published}
                  onCheckedChange={(checked) => updateField("is_published", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
