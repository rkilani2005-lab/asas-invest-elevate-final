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
      agents: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          properties_assigned: string[] | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          properties_assigned?: string[] | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          properties_assigned?: string[] | null
          role?: string | null
        }
        Relationships: []
      }
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
      email_log: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string | null
          error_message: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          recipient_email: string
          recipient_type: string | null
          sender_email: string
          sent_at: string | null
          status: string | null
          subject: string
          submission_id: string | null
          template_name: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          recipient_email: string
          recipient_type?: string | null
          sender_email: string
          sent_at?: string | null
          status?: string | null
          subject: string
          submission_id?: string | null
          template_name: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          recipient_email?: string
          recipient_type?: string | null
          sender_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          submission_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html_ar: string | null
          body_html_en: string
          body_text_en: string | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sender_account: string
          slug: string
          subject_ar: string | null
          subject_en: string
          updated_at: string | null
          variables_used: string[] | null
        }
        Insert: {
          body_html_ar?: string | null
          body_html_en: string
          body_text_en?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sender_account?: string
          slug: string
          subject_ar?: string | null
          subject_en: string
          updated_at?: string | null
          variables_used?: string[] | null
        }
        Update: {
          body_html_ar?: string | null
          body_html_en?: string
          body_text_en?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sender_account?: string
          slug?: string
          subject_ar?: string | null
          subject_en?: string
          updated_at?: string | null
          variables_used?: string[] | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          assigned_agent_id: string | null
          attendees: number | null
          budget_range: string | null
          callback_time: string | null
          consent_given: boolean | null
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          follow_up_date: string | null
          form_type: string
          id: string
          newsletter_interests: string | null
          notes: string | null
          preferred_contact: string | null
          preferred_language: string | null
          property_id: string | null
          property_name: string | null
          purpose: string | null
          source_page: string | null
          status: string | null
          subject: string | null
          team_notified: boolean | null
          unit_type_interest: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          viewing_alt_date: string | null
          viewing_date: string | null
          viewing_time: string | null
          visitor_email: string
          visitor_message: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          attendees?: number | null
          budget_range?: string | null
          callback_time?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          follow_up_date?: string | null
          form_type: string
          id?: string
          newsletter_interests?: string | null
          notes?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          property_id?: string | null
          property_name?: string | null
          purpose?: string | null
          source_page?: string | null
          status?: string | null
          subject?: string | null
          team_notified?: boolean | null
          unit_type_interest?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewing_alt_date?: string | null
          viewing_date?: string | null
          viewing_time?: string | null
          visitor_email: string
          visitor_message?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          attendees?: number | null
          budget_range?: string | null
          callback_time?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          follow_up_date?: string | null
          form_type?: string
          id?: string
          newsletter_interests?: string | null
          notes?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          property_id?: string | null
          property_name?: string | null
          purpose?: string | null
          source_page?: string | null
          status?: string | null
          subject?: string | null
          team_notified?: boolean | null
          unit_type_interest?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewing_alt_date?: string | null
          viewing_date?: string | null
          viewing_time?: string | null
          visitor_email?: string
          visitor_message?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_connected: boolean | null
          last_tested_at: string | null
          purpose: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_connected?: boolean | null
          last_tested_at?: string | null
          purpose: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_connected?: boolean | null
          last_tested_at?: string | null
          purpose?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          ai_extraction_raw: Json | null
          cms_property_id: string | null
          cms_url: string | null
          created_at: string | null
          developer_ar: string | null
          developer_en: string | null
          dropbox_folder_path: string
          enduser_text_ar: string | null
          enduser_text_en: string | null
          error_log: string | null
          folder_name: string
          handover_date: string | null
          highlights_ar: string | null
          highlights_en: string | null
          id: string
          image_count: number | null
          import_status: string | null
          investment_ar: string | null
          investment_en: string | null
          is_featured: boolean | null
          location_ar: string | null
          location_en: string | null
          name_ar: string | null
          name_en: string | null
          overview_ar: string | null
          overview_en: string | null
          ownership_type: string | null
          pdf_count: number | null
          price_range: string | null
          size_range: string | null
          slug: string | null
          status: string | null
          tagline_ar: string | null
          tagline_en: string | null
          total_size_bytes: number | null
          type: string | null
          unit_types: string | null
          updated_at: string | null
          video_count: number | null
          video_url: string | null
        }
        Insert: {
          ai_extraction_raw?: Json | null
          cms_property_id?: string | null
          cms_url?: string | null
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          dropbox_folder_path: string
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          error_log?: string | null
          folder_name: string
          handover_date?: string | null
          highlights_ar?: string | null
          highlights_en?: string | null
          id?: string
          image_count?: number | null
          import_status?: string | null
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          location_ar?: string | null
          location_en?: string | null
          name_ar?: string | null
          name_en?: string | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          pdf_count?: number | null
          price_range?: string | null
          size_range?: string | null
          slug?: string | null
          status?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          total_size_bytes?: number | null
          type?: string | null
          unit_types?: string | null
          updated_at?: string | null
          video_count?: number | null
          video_url?: string | null
        }
        Update: {
          ai_extraction_raw?: Json | null
          cms_property_id?: string | null
          cms_url?: string | null
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          dropbox_folder_path?: string
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          error_log?: string | null
          folder_name?: string
          handover_date?: string | null
          highlights_ar?: string | null
          highlights_en?: string | null
          id?: string
          image_count?: number | null
          import_status?: string | null
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          location_ar?: string | null
          location_en?: string | null
          name_ar?: string | null
          name_en?: string | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          pdf_count?: number | null
          price_range?: string | null
          size_range?: string | null
          slug?: string | null
          status?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          total_size_bytes?: number | null
          type?: string | null
          unit_types?: string | null
          updated_at?: string | null
          video_count?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          job_id: string | null
          level: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          job_id?: string | null
          level?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          job_id?: string | null
          level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_media: {
        Row: {
          cms_media_id: string | null
          compressed_size_bytes: number | null
          compression_status: string | null
          created_at: string | null
          dropbox_path: string | null
          error_message: string | null
          id: string
          is_hero: boolean | null
          job_id: string | null
          media_type: string | null
          original_filename: string
          original_size_bytes: number | null
          sort_order: number | null
          storage_url: string | null
        }
        Insert: {
          cms_media_id?: string | null
          compressed_size_bytes?: number | null
          compression_status?: string | null
          created_at?: string | null
          dropbox_path?: string | null
          error_message?: string | null
          id?: string
          is_hero?: boolean | null
          job_id?: string | null
          media_type?: string | null
          original_filename: string
          original_size_bytes?: number | null
          sort_order?: number | null
          storage_url?: string | null
        }
        Update: {
          cms_media_id?: string | null
          compressed_size_bytes?: number | null
          compression_status?: string | null
          created_at?: string | null
          dropbox_path?: string | null
          error_message?: string | null
          id?: string
          is_hero?: boolean | null
          job_id?: string | null
          media_type?: string | null
          original_filename?: string
          original_size_bytes?: number | null
          sort_order?: number | null
          storage_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      importer_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
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
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          interests: string[] | null
          is_active: boolean | null
          name: string | null
          preferred_language: string | null
          unsubscribe_token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          name?: string | null
          preferred_language?: string | null
          unsubscribe_token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          name?: string | null
          preferred_language?: string | null
          unsubscribe_token?: string | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          content_ar: string | null
          content_en: string | null
          id: string
          page_slug: string
          section_key: string
          sort_order: number | null
          title_ar: string | null
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          id?: string
          page_slug: string
          section_key: string
          sort_order?: number | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          id?: string
          page_slug?: string
          section_key?: string
          sort_order?: number | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          category: Database["public"]["Enums"]["property_category"]
          created_at: string | null
          developer_ar: string | null
          developer_en: string | null
          enduser_text_ar: string | null
          enduser_text_en: string | null
          fit_out_status: string | null
          handover_date: string | null
          highlights_ar: Json | null
          highlights_en: Json | null
          id: string
          investment_ar: string | null
          investment_en: string | null
          is_featured: boolean | null
          license_type: string | null
          location_ar: string | null
          location_coords: unknown
          location_en: string | null
          map_embed_code: string | null
          name_ar: string | null
          name_en: string
          nearby_ar: Json | null
          nearby_en: Json | null
          office_type: string | null
          overview_ar: string | null
          overview_en: string | null
          ownership_type: string | null
          pantry_available: boolean | null
          parking: string | null
          parking_ratio: string | null
          parking_spaces: number | null
          power_load_kw: string | null
          price_range: string | null
          projected_roi: string | null
          service_charges: string | null
          size_range: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["property_status"]
          tagline_ar: string | null
          tagline_en: string | null
          tenancy_status: string | null
          type: Database["public"]["Enums"]["property_type"]
          unit_types: string[] | null
          updated_at: string | null
          video_url: string | null
          washroom_type: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["property_category"]
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          fit_out_status?: string | null
          handover_date?: string | null
          highlights_ar?: Json | null
          highlights_en?: Json | null
          id?: string
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          license_type?: string | null
          location_ar?: string | null
          location_coords?: unknown
          location_en?: string | null
          map_embed_code?: string | null
          name_ar?: string | null
          name_en: string
          nearby_ar?: Json | null
          nearby_en?: Json | null
          office_type?: string | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          pantry_available?: boolean | null
          parking?: string | null
          parking_ratio?: string | null
          parking_spaces?: number | null
          power_load_kw?: string | null
          price_range?: string | null
          projected_roi?: string | null
          service_charges?: string | null
          size_range?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tagline_ar?: string | null
          tagline_en?: string | null
          tenancy_status?: string | null
          type?: Database["public"]["Enums"]["property_type"]
          unit_types?: string[] | null
          updated_at?: string | null
          video_url?: string | null
          washroom_type?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["property_category"]
          created_at?: string | null
          developer_ar?: string | null
          developer_en?: string | null
          enduser_text_ar?: string | null
          enduser_text_en?: string | null
          fit_out_status?: string | null
          handover_date?: string | null
          highlights_ar?: Json | null
          highlights_en?: Json | null
          id?: string
          investment_ar?: string | null
          investment_en?: string | null
          is_featured?: boolean | null
          license_type?: string | null
          location_ar?: string | null
          location_coords?: unknown
          location_en?: string | null
          map_embed_code?: string | null
          name_ar?: string | null
          name_en?: string
          nearby_ar?: Json | null
          nearby_en?: Json | null
          office_type?: string | null
          overview_ar?: string | null
          overview_en?: string | null
          ownership_type?: string | null
          pantry_available?: boolean | null
          parking?: string | null
          parking_ratio?: string | null
          parking_spaces?: number | null
          power_load_kw?: string | null
          price_range?: string | null
          projected_roi?: string | null
          service_charges?: string | null
          size_range?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tagline_ar?: string | null
          tagline_en?: string | null
          tenancy_status?: string | null
          type?: Database["public"]["Enums"]["property_type"]
          unit_types?: string[] | null
          updated_at?: string | null
          video_url?: string | null
          washroom_type?: string | null
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string | null
          id: string
          recipient_email: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          submission_id: string | null
          template_name: string
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_email: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          submission_id?: string | null
          template_name: string
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_email?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          submission_id?: string | null
          template_name?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      services: {
        Row: {
          category: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title_ar: string | null
          title_en: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_ar?: string | null
          title_en: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_ar?: string | null
          title_en?: string
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
      property_category: "residential" | "commercial"
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
      property_category: ["residential", "commercial"],
      property_status: ["available", "reserved", "sold"],
      property_type: ["off-plan", "ready"],
      translation_category: ["ui", "content", "property"],
    },
  },
} as const
