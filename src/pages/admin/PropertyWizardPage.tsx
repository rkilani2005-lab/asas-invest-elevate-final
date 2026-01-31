import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PropertyWizard from "@/components/admin/property-wizard/PropertyWizard";
import type { PropertyData } from "@/components/admin/property-wizard/types";

const defaultPropertyData: PropertyData = {
  // General
  name_en: "",
  name_ar: "",
  slug: "",
  tagline_en: "",
  tagline_ar: "",
  developer_en: "",
  developer_ar: "",
  location_en: "",
  location_ar: "",
  price_range: "",
  size_range: "",
  unit_types: [],
  ownership_type: "freehold",
  type: "off-plan",
  handover_date: "",
  // Details
  overview_en: "",
  overview_ar: "",
  highlights_en: [],
  highlights_ar: [],
  nearby_en: [],
  nearby_ar: [],
  amenities: [],
  // Media
  media: [],
  video_url: "",
  map_embed_code: "",
  // Financials
  payment_milestones: [],
  status: "available",
  is_featured: false,
  investment_en: "",
  investment_ar: "",
  enduser_text_en: "",
  enduser_text_ar: "",
};

export default function PropertyWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [data, setData] = useState<PropertyData>(defaultPropertyData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  async function fetchProperty() {
    setIsLoading(true);
    
    // Fetch property with related data
    const { data: property, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to load property");
      navigate("/admin/properties");
      return;
    }

    // Fetch amenities
    const { data: amenities } = await supabase
      .from("amenities")
      .select("*")
      .eq("property_id", id);

    // Fetch media
    const { data: media } = await supabase
      .from("media")
      .select("*")
      .eq("property_id", id)
      .order("order_index");

    // Fetch payment milestones
    const { data: milestones } = await supabase
      .from("payment_milestones")
      .select("*")
      .eq("property_id", id)
      .order("sort_order");

    setData({
      ...defaultPropertyData,
      ...property,
      highlights_en: Array.isArray(property.highlights_en) ? (property.highlights_en as string[]) : [],
      highlights_ar: Array.isArray(property.highlights_ar) ? (property.highlights_ar as string[]) : [],
      nearby_en: Array.isArray(property.nearby_en) ? (property.nearby_en as any[]) : [],
      nearby_ar: Array.isArray(property.nearby_ar) ? (property.nearby_ar as any[]) : [],
      amenities: amenities || [],
      media: media || [],
      payment_milestones: milestones?.map(m => ({
        id: m.id,
        milestone_en: m.milestone_en,
        milestone_ar: m.milestone_ar || "",
        percentage: m.percentage,
        sort_order: m.sort_order || 0,
      })) || [],
    });
    
    setIsLoading(false);
  }

  async function handleSave() {
    if (!data.name_en || !data.slug) {
      toast.error("Name and slug are required");
      return;
    }

    setIsSaving(true);

    try {
    // Prepare property data (exclude related data)
      const propertyPayload: any = {
        name_en: data.name_en,
        name_ar: data.name_ar,
        slug: data.slug,
        tagline_en: data.tagline_en,
        tagline_ar: data.tagline_ar,
        developer_en: data.developer_en,
        developer_ar: data.developer_ar,
        location_en: data.location_en,
        location_ar: data.location_ar,
        price_range: data.price_range,
        size_range: data.size_range,
        unit_types: data.unit_types,
        ownership_type: data.ownership_type,
        type: data.type,
        handover_date: data.handover_date || null,
        overview_en: data.overview_en,
        overview_ar: data.overview_ar,
        highlights_en: data.highlights_en,
        highlights_ar: data.highlights_ar,
        nearby_en: data.nearby_en,
        nearby_ar: data.nearby_ar,
        video_url: data.video_url,
        map_embed_code: data.map_embed_code,
        status: data.status,
        is_featured: data.is_featured,
        investment_en: data.investment_en,
        investment_ar: data.investment_ar,
        enduser_text_en: data.enduser_text_en,
        enduser_text_ar: data.enduser_text_ar,
      };

      let propertyId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("properties")
          .update(propertyPayload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: newProperty, error } = await supabase
          .from("properties")
          .insert(propertyPayload)
          .select("id")
          .single();
        if (error) throw error;
        propertyId = newProperty.id;
      }

      // Handle amenities
      if (propertyId) {
        // Delete existing amenities and re-insert
        await supabase.from("amenities").delete().eq("property_id", propertyId);
        
        if (data.amenities.length > 0) {
          const amenitiesPayload = data.amenities.map(a => ({
            property_id: propertyId,
            name_en: a.name_en,
            name_ar: a.name_ar,
            icon: a.icon,
            category: a.category,
          }));
          await supabase.from("amenities").insert(amenitiesPayload);
        }

        // Handle payment milestones
        await supabase.from("payment_milestones").delete().eq("property_id", propertyId);
        
        if (data.payment_milestones.length > 0) {
          const milestonesPayload = data.payment_milestones.map((m, index) => ({
            property_id: propertyId,
            milestone_en: m.milestone_en,
            milestone_ar: m.milestone_ar,
            percentage: m.percentage,
            sort_order: index,
          }));
          await supabase.from("payment_milestones").insert(milestonesPayload);
        }
      }

      toast.success(isEditing ? "Property updated" : "Property created");
      navigate("/admin/properties");
    } catch (error: any) {
      toast.error(error.message || "Failed to save property");
    } finally {
      setIsSaving(false);
    }
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Edit Property" : "New Property"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEditing ? "Update property details" : "Create a new property listing"}
            </p>
          </div>
        </div>
      </div>

      <PropertyWizard
        data={data}
        onChange={setData}
        onSave={handleSave}
        isSaving={isSaving}
        isEditing={isEditing}
        propertyId={id}
      />
    </div>
  );
}
