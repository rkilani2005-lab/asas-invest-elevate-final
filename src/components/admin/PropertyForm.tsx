import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

interface PropertyFormProps {
  property: Property | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function PropertyForm({ property, onSuccess, onCancel }: PropertyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name_en: property?.name_en || "",
    name_ar: property?.name_ar || "",
    slug: property?.slug || "",
    tagline_en: property?.tagline_en || "",
    tagline_ar: property?.tagline_ar || "",
    overview_en: property?.overview_en || "",
    overview_ar: property?.overview_ar || "",
    location_en: property?.location_en || "",
    location_ar: property?.location_ar || "",
    developer_en: property?.developer_en || "",
    developer_ar: property?.developer_ar || "",
    price_range: property?.price_range || "",
    size_range: property?.size_range || "",
    ownership_type: property?.ownership_type || "",
    parking: property?.parking || "",
    type: property?.type || "off-plan",
    status: property?.status || "available",
    is_featured: property?.is_featured || false,
    sort_order: property?.sort_order || 0,
    handover_date: property?.handover_date || "",
    video_url: property?.video_url || "",
  });

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug from English name
      if (field === "name_en" && typeof value === "string" && !property) {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name_en.trim() || !formData.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (property) {
        // Update existing property
        const { error } = await supabase
          .from("properties")
          .update({
            ...formData,
            handover_date: formData.handover_date || null,
          })
          .eq("id", property.id);

        if (error) throw error;
        toast.success("Property updated successfully");
      } else {
        // Create new property
        const { error } = await supabase
          .from("properties")
          .insert({
            ...formData,
            handover_date: formData.handover_date || null,
          });

        if (error) throw error;
        toast.success("Property created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name_en">Name (English) *</Label>
              <Input
                id="name_en"
                value={formData.name_en}
                onChange={(e) => handleChange("name_en", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => handleChange("name_ar", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tagline_en">Tagline (English)</Label>
              <Input
                id="tagline_en"
                value={formData.tagline_en}
                onChange={(e) => handleChange("tagline_en", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline_ar">Tagline (Arabic)</Label>
              <Input
                id="tagline_ar"
                value={formData.tagline_ar}
                onChange={(e) => handleChange("tagline_ar", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overview_en">Overview (English)</Label>
              <Textarea
                id="overview_en"
                value={formData.overview_en}
                onChange={(e) => handleChange("overview_en", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overview_ar">Overview (Arabic)</Label>
              <Textarea
                id="overview_ar"
                value={formData.overview_ar}
                onChange={(e) => handleChange("overview_ar", e.target.value)}
                rows={4}
                dir="rtl"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_en">Location (English)</Label>
              <Input
                id="location_en"
                value={formData.location_en}
                onChange={(e) => handleChange("location_en", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_ar">Location (Arabic)</Label>
              <Input
                id="location_ar"
                value={formData.location_ar}
                onChange={(e) => handleChange("location_ar", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="developer_en">Developer (English)</Label>
              <Input
                id="developer_en"
                value={formData.developer_en}
                onChange={(e) => handleChange("developer_en", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="developer_ar">Developer (Arabic)</Label>
              <Input
                id="developer_ar"
                value={formData.developer_ar}
                onChange={(e) => handleChange("developer_ar", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_range">Price Range</Label>
              <Input
                id="price_range"
                value={formData.price_range}
                onChange={(e) => handleChange("price_range", e.target.value)}
                placeholder="e.g., AED 1.2M - 3.5M"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_range">Size Range</Label>
              <Input
                id="size_range"
                value={formData.size_range}
                onChange={(e) => handleChange("size_range", e.target.value)}
                placeholder="e.g., 800 - 2,500 sqft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownership_type">Ownership Type</Label>
              <Input
                id="ownership_type"
                value={formData.ownership_type}
                onChange={(e) => handleChange("ownership_type", e.target.value)}
                placeholder="e.g., Freehold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parking">Parking</Label>
              <Input
                id="parking"
                value={formData.parking}
                onChange={(e) => handleChange("parking", e.target.value)}
                placeholder="e.g., 1-2 spaces"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL</Label>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => handleChange("video_url", e.target.value)}
              placeholder="YouTube or Vimeo URL"
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Property Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off-plan">Off-Plan</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handover_date">Handover Date (Off-Plan)</Label>
              <Input
                id="handover_date"
                type="date"
                value={formData.handover_date}
                onChange={(e) => handleChange("handover_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleChange("sort_order", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => handleChange("is_featured", checked)}
            />
            <Label htmlFor="is_featured">Featured Property</Label>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : property ? (
            "Update Property"
          ) : (
            "Create Property"
          )}
        </Button>
      </div>
    </form>
  );
}
