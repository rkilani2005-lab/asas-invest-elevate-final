export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          category: string | null
          created_at: string | null
          icon: string | null
          id: string
          name_ar: string | null
          name_en: string
          property_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_en: string
          property_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_library: {
        Row: {
          category: string | null
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          inquiry_type: string | null
          interests: string[] | null
          message: string | null
          name: string
          phone: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          inquiry_type?: string | null
          interests?: string[] | null
          message?: string | null
          name: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          inquiry_type?: string | null
          interests?: string[] | null
          message?: string | null
          name?: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          author_ar: string | null
          author_en: string | null
          category: string
          content_ar: string | null
          content_en: string | null
          created_at: string | null
          excerpt_ar: string | null
          excerpt_en: string | null
          featured_image: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          meta_description_ar: string | null
          meta_description_en: string | null
          meta_title_ar: string | null
          meta_title_en: string | null
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          title_ar: string | null
          title_en: string
          updated_at: string | null
        }
        Insert: {
          author_ar?: string | null
          author_en?: string | null
          category?: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          title_ar?: string | null
          title_en: string
          updated_at?: string | null
        }
        Update: {
          author_ar?: string | null
          author_en?: string | null
          category?: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          title_ar?: string | null
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          caption_ar: string | null
          caption_en: string | null
          category: string | null
          created_at: string | null
          file_size: number | null
          id: string
          order_index: number | null
          property_id: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          caption_ar?: string | null
          caption_en?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          order_index?: number | null
          property_id?: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          caption_ar?: string | null
          caption_en?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          order_index?: number | null
          property_id?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pages_content: {
        Row: {
          content_ar: Json | null
          content_en: Json | null
          id: string
          page_slug: string
          section_key: string
          updated_at: string | null
        }
        Insert: {
          content_ar?: Json | null
          content_en?: Json | null
          id?: string
          page_slug: string
          section_key: string
          updated_at?: string | null
        }
        Update: {
          content_ar?: Json | null
          content_en?: Json | null
          id?: string
          page_slug?: string
          section_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_milestones: {
        Row: {
          created_at: string | null
          id: string
          milestone_ar: string | null
          milestone_en: string
          percentage: number
          property_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          milestone_ar?: string | null
          milestone_en: string
          percentage: number
          property_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          milestone_ar?: string | null
          milestone_en?: string
          percentage?: number
          property_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestones_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          created_at: string | null
          developer_ar: string | null
          developer_en: string | null
          enduser_text_ar: string | null
          enduser_text_en: string | null
          handover_date: string | null
          highlights_ar: Json | null
          highlights_en: Json | null
          id: string
          investment_ar: string | null
          investment_en: string | null
          is_featured: boolean | null
          location_ar: string | null
          location_coords: unknown
          location_en: string | null
          map_embed_code: string | null
          name_ar: string | null
          name_en: string
          nearby_ar: Json | null
          nearby_en: Json | null
          overview_ar: string | null
          overview_en: string | null
          ownership_type: string | null
          parking: string | null
          price_range: string | null
          size_range: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["property_status"]
          tagline_ar: string | null
          tagline_en: string | null
          type: Database["public"]["Enums"]["property_type"]
          unit_types: string[] | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          handover_date?: string | null
          highlights_ar?: Json | null
          highlights_en?: Json | null
          id?: string
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          location_ar?: string | null
          location_coords?: unknown
          location_en?: string | null
          map_embed_code?: string | null
          name_ar?: string | null
          name_en: string
          nearby_ar?: Json | null
          nearby_en?: Json | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          parking?: string | null
          price_range?: string | null
          size_range?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tagline_ar?: string | null
          tagline_en?: string | null
          type?: Database["public"]["Enums"]["property_type"]
          unit_types?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          handover_date?: string | null
          highlights_ar?: Json | null
          highlights_en?: Json | null
          id?: string
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          location_ar?: string | null
          location_coords?: unknown
          location_en?: string | null
          map_embed_code?: string | null
          name_ar?: string | null
          name_en?: string
          nearby_ar?: Json | null
          nearby_en?: Json | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          parking?: string | null
          price_range?: string | null
          size_range?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tagline_ar?: string | null
          tagline_en?: string | null
          type?: Database["public"]["Enums"]["property_type"]
          unit_types?: string[] | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      seo_meta: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          og_image: string | null
          page_type: string
          reference_id: string | null
          slug: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          og_image?: string | null
          page_type: string
          reference_id?: string | null
          slug?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          og_image?: string | null
          page_type?: string
          reference_id?: string | null
          slug?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      translations: {
        Row: {
          ar_text: string | null
          category: Database["public"]["Enums"]["translation_category"]
          created_at: string | null
          en_text: string
          key: string
          updated_at: string | null
        }
        Insert: {
          ar_text?: string | null
          category?: Database["public"]["Enums"]["translation_category"]
          created_at?: string | null
          en_text: string
          key: string
          updated_at?: string | null
        }
        Update: {
          ar_text?: string | null
          category?: Database["public"]["Enums"]["translation_category"]
          created_at?: string | null
          en_text?: string
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      inquiry_status: "new" | "contacted" | "closed"
      media_type:
        | "render"
        | "floorplan"
        | "floor_plate"
        | "material"
        | "video"
        | "interior"
        | "hero"
        | "brochure"
      property_status: "available" | "reserved" | "sold"
      property_type: "off-plan" | "ready"
      translation_category: "ui" | "content" | "property"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      inquiry_status: ["new", "contacted", "closed"],
      media_type: [
        "render",
        "floorplan",
        "floor_plate",
        "material",
        "video",
        "interior",
        "hero",
        "brochure",
      ],
      property_status: ["available", "reserved", "sold"],
      property_type: ["off-plan", "ready"],
      translation_category: ["ui", "content", "property"],
    },
  },
} as const
