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
  category: "residential",
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
  // Commercial
  license_type: "",
  fit_out_status: "",
  office_type: "",
  power_load_kw: "",
  pantry_available: false,
  washroom_type: "",
  parking_spaces: "",
  parking_ratio: "",
  projected_roi: "",
  tenancy_status: "",
  service_charges: "",
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
      // First, check for custom amenities and add them to the library
      await saveCustomAmenitiesToLibrary();

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
        category: data.category,
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
        // Commercial fields
        license_type: data.license_type || null,
        fit_out_status: data.fit_out_status || null,
        office_type: data.office_type || null,
        power_load_kw: data.power_load_kw || null,
        pantry_available: data.pantry_available,
        washroom_type: data.washroom_type || null,
        parking_spaces: data.parking_spaces ? Number(data.parking_spaces) : null,
        parking_ratio: data.parking_ratio || null,
        projected_roi: data.projected_roi || null,
        tenancy_status: data.tenancy_status || null,
        service_charges: data.service_charges || null,
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
        const { error: deleteAmenitiesError } = await supabase.from("amenities").delete().eq("property_id", propertyId);
        if (deleteAmenitiesError) console.error("Delete amenities error:", deleteAmenitiesError);
        
        if (data.amenities.length > 0) {
          const amenitiesPayload = data.amenities.map(a => ({
            property_id: propertyId,
            name_en: a.name_en,
            name_ar: a.name_ar,
            icon: a.icon,
            category: a.category,
          }));
          const { error: insertAmenitiesError } = await supabase.from("amenities").insert(amenitiesPayload);
          if (insertAmenitiesError) {
            console.error("Insert amenities error:", insertAmenitiesError);
            throw new Error(`Failed to save amenities: ${insertAmenitiesError.message}`);
          }
        }

        // Handle payment milestones
        const { error: deleteMilestonesError } = await supabase.from("payment_milestones").delete().eq("property_id", propertyId);
        if (deleteMilestonesError) console.error("Delete milestones error:", deleteMilestonesError);
        
        if (data.payment_milestones.length > 0) {
          const milestonesPayload = data.payment_milestones.map((m, index) => ({
            property_id: propertyId,
            milestone_en: m.milestone_en,
            milestone_ar: m.milestone_ar,
            percentage: m.percentage,
            sort_order: index,
          }));
          const { error: insertMilestonesError } = await supabase.from("payment_milestones").insert(milestonesPayload);
          if (insertMilestonesError) {
            console.error("Insert milestones error:", insertMilestonesError);
            throw new Error(`Failed to save milestones: ${insertMilestonesError.message}`);
          }
        }

        // Handle media
        const { error: deleteMediaError } = await supabase.from("media").delete().eq("property_id", propertyId);
        if (deleteMediaError) console.error("Delete media error:", deleteMediaError);
        
        if (data.media.length > 0) {
          const mediaPayload = data.media.map((m, index) => ({
            property_id: propertyId,
            url: m.url,
            type: m.type,
            category: m.category || "general",
            caption_en: m.caption_en,
            caption_ar: m.caption_ar,
            order_index: index,
          }));
          const { error: insertMediaError } = await supabase.from("media").insert(mediaPayload);
          if (insertMediaError) {
            console.error("Insert media error:", insertMediaError);
            throw new Error(`Failed to save media: ${insertMediaError.message}`);
          }
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

  async function saveCustomAmenitiesToLibrary() {
    // Fetch existing library amenities
    const { data: libraryAmenities } = await supabase
      .from("amenity_library")
      .select("name_en");

    const existingNames = new Set(
      (libraryAmenities || []).map((a) => a.name_en.toLowerCase())
    );

    // Find custom amenities not in library
    const customAmenities = data.amenities.filter(
      (amenity) => !existingNames.has(amenity.name_en.toLowerCase())
    );

    // Add custom amenities to library
    if (customAmenities.length > 0) {
      const newLibraryItems = customAmenities.map((amenity) => ({
        name_en: amenity.name_en,
        name_ar: amenity.name_ar || null,
        icon: amenity.icon || "Star",
        category: amenity.category || "General",
        is_active: true,
      }));

      const { error } = await supabase
        .from("amenity_library")
        .insert(newLibraryItems);

      if (error) {
        console.error("Failed to add custom amenities to library:", error);
      } else if (customAmenities.length > 0) {
        toast.info(`${customAmenities.length} custom amenity(ies) added to library`);
      }
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
