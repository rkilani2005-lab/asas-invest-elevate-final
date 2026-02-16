import type { Database } from "@/integrations/supabase/types";

export type PropertyType = Database["public"]["Enums"]["property_type"];
export type PropertyStatus = Database["public"]["Enums"]["property_status"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type PropertyCategory = Database["public"]["Enums"]["property_category"];

export interface MediaItem {
  id?: string;
  url: string;
  type: MediaType;
  category: string;
  caption_en?: string;
  caption_ar?: string;
  order_index: number;
}

export interface AmenityItem {
  id?: string;
  name_en: string;
  name_ar?: string;
  icon?: string;
  category?: string;
}

export interface PaymentMilestone {
  id?: string;
  milestone_en: string;
  milestone_ar: string;
  percentage: number;
  sort_order: number;
}

export interface NearbyPlace {
  id: string;
  name_en: string;
  name_ar: string;
  distance: string;
  type: string;
}

export interface PropertyData {
  // General Info
  name_en: string;
  name_ar: string;
  slug: string;
  tagline_en: string;
  tagline_ar: string;
  developer_en: string;
  developer_ar: string;
  location_en: string;
  location_ar: string;
  price_range: string;
  size_range: string;
  unit_types: string[];
  ownership_type: string;
  type: PropertyType;
  category: PropertyCategory;
  handover_date: string;
  
  // Details
  overview_en: string;
  overview_ar: string;
  highlights_en: string[];
  highlights_ar: string[];
  nearby_en: NearbyPlace[];
  nearby_ar: NearbyPlace[];
  amenities: AmenityItem[];
  
  // Media
  media: MediaItem[];
  video_url: string;
  map_embed_code: string;
  
  // Financials
  payment_milestones: PaymentMilestone[];
  status: PropertyStatus;
  is_featured: boolean;
  investment_en: string;
  investment_ar: string;
  enduser_text_en: string;
  enduser_text_ar: string;

  // Commercial fields
  license_type: string;
  fit_out_status: string;
  office_type: string;
  power_load_kw: string;
  pantry_available: boolean;
  washroom_type: string;
  parking_spaces: number | string;
  parking_ratio: string;
  projected_roi: string;
  tenancy_status: string;
  service_charges: string;
}
