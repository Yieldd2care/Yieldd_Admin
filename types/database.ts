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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_cards: {
        Row: {
          bio: string | null
          company_name: string | null
          created_at: string
          designation: string | null
          display_name: string
          email: string | null
          id: string
          is_published: boolean
          linkedin_url: string | null
          office_address: string | null
          phone: string | null
          photo_path: string | null
          profile_id: string
          secondary_email: string | null
          slug: string
          social_links: Json
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company_name?: string | null
          created_at?: string
          designation?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_published?: boolean
          linkedin_url?: string | null
          office_address?: string | null
          phone?: string | null
          photo_path?: string | null
          profile_id: string
          secondary_email?: string | null
          slug: string
          social_links?: Json
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company_name?: string | null
          created_at?: string
          designation?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_published?: boolean
          linkedin_url?: string | null
          office_address?: string | null
          phone?: string | null
          photo_path?: string | null
          profile_id?: string
          secondary_email?: string | null
          slug?: string
          social_links?: Json
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_summaries: {
        Row: {
          created_at: string
          domain: string
          model: string | null
          refreshed_at: string
          source_urls: string[]
          summary: string
        }
        Insert: {
          created_at?: string
          domain: string
          model?: string | null
          refreshed_at?: string
          source_urls?: string[]
          summary: string
        }
        Update: {
          created_at?: string
          domain?: string
          model?: string | null
          refreshed_at?: string
          source_urls?: string[]
          summary?: string
        }
        Relationships: []
      }
      event_custom_field_defs: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          is_required: boolean
          label: string
          options: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_custom_field_defs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          email_template_override_id: string | null
          event_id: string
          id: string
          invited_at: string
          joined_at: string | null
          profile_id: string
          status: Database["public"]["Enums"]["member_status"]
          whatsapp_template_override_id: string | null
        }
        Insert: {
          email_template_override_id?: string | null
          event_id: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["member_status"]
          whatsapp_template_override_id?: string | null
        }
        Update: {
          email_template_override_id?: string | null
          event_id?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          whatsapp_template_override_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_members_email_override_fk"
            columns: ["email_template_override_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_whatsapp_override_fk"
            columns: ["whatsapp_template_override_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          cost_accommodation_paisa: number | null
          cost_fabrication_paisa: number | null
          cost_furniture_paisa: number | null
          cost_marketing_paisa: number | null
          cost_staff_paisa: number | null
          cost_stall_paisa: number | null
          cost_travel_paisa: number | null
          created_at: string
          created_by: string
          email_template_id: string | null
          end_date: string
          id: string
          leaderboard_visible_to_reps: boolean
          name: string
          organization_id: string
          stall_number: string | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          total_cost_paisa: number | null
          updated_at: string
          whatsapp_template_id: string | null
        }
        Insert: {
          city?: string | null
          cost_accommodation_paisa?: number | null
          cost_fabrication_paisa?: number | null
          cost_furniture_paisa?: number | null
          cost_marketing_paisa?: number | null
          cost_staff_paisa?: number | null
          cost_stall_paisa?: number | null
          cost_travel_paisa?: number | null
          created_at?: string
          created_by: string
          email_template_id?: string | null
          end_date: string
          id?: string
          leaderboard_visible_to_reps?: boolean
          name: string
          organization_id: string
          stall_number?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          total_cost_paisa?: number | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Update: {
          city?: string | null
          cost_accommodation_paisa?: number | null
          cost_fabrication_paisa?: number | null
          cost_furniture_paisa?: number | null
          cost_marketing_paisa?: number | null
          cost_staff_paisa?: number | null
          cost_stall_paisa?: number | null
          cost_travel_paisa?: number | null
          created_at?: string
          created_by?: string
          email_template_id?: string | null
          end_date?: string
          id?: string
          leaderboard_visible_to_reps?: boolean
          name?: string
          organization_id?: string
          stall_number?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          total_cost_paisa?: number | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_email_template_fk"
            columns: ["organization_id", "email_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_whatsapp_template_fk"
            columns: ["organization_id", "whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          event_id: string | null
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          organization_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["lead_outcome"] | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["lead_outcome"] | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["lead_outcome"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          captured_by: string
          card_image_path: string | null
          company: string | null
          company_address: string | null
          company_landline: string | null
          company_summary: string | null
          company_summary_generated_at: string | null
          company_website: string | null
          consent_at: string | null
          consent_given: boolean
          created_at: string
          custom_field_values: Json
          deal_closed_at: string | null
          deal_value_paisa: number | null
          designation: string | null
          duplicate_of_lead_id: string | null
          email: string | null
          event_id: string
          extraction_status: Database["public"]["Enums"]["extraction_status"]
          follow_up_date: string | null
          full_name: string
          id: string
          note: string | null
          organization_id: string
          phone: string | null
          reviewed_at: string | null
          saved_to_contacts: boolean
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          captured_by: string
          card_image_path?: string | null
          company?: string | null
          company_address?: string | null
          company_landline?: string | null
          company_summary?: string | null
          company_summary_generated_at?: string | null
          company_website?: string | null
          consent_at?: string | null
          consent_given?: boolean
          created_at?: string
          custom_field_values?: Json
          deal_closed_at?: string | null
          deal_value_paisa?: number | null
          designation?: string | null
          duplicate_of_lead_id?: string | null
          email?: string | null
          event_id: string
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          follow_up_date?: string | null
          full_name: string
          id?: string
          note?: string | null
          organization_id: string
          phone?: string | null
          reviewed_at?: string | null
          saved_to_contacts?: boolean
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          captured_by?: string
          card_image_path?: string | null
          company?: string | null
          company_address?: string | null
          company_landline?: string | null
          company_summary?: string | null
          company_summary_generated_at?: string | null
          company_website?: string | null
          consent_at?: string | null
          consent_given?: boolean
          created_at?: string
          custom_field_values?: Json
          deal_closed_at?: string | null
          deal_value_paisa?: number | null
          designation?: string | null
          duplicate_of_lead_id?: string | null
          email?: string | null
          event_id?: string
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          follow_up_date?: string | null
          full_name?: string
          id?: string
          note?: string | null
          organization_id?: string
          phone?: string | null
          reviewed_at?: string | null
          saved_to_contacts?: boolean
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_duplicate_of_lead_id_fkey"
            columns: ["duplicate_of_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_batches: {
        Row: {
          channel: Database["public"]["Enums"]["message_channel"]
          completed_at: string | null
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          organization_id: string
          started_at: string
          total_count: number
        }
        Insert: {
          channel: Database["public"]["Enums"]["message_channel"]
          completed_at?: string | null
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          organization_id: string
          started_at?: string
          total_count?: number
        }
        Update: {
          channel?: Database["public"]["Enums"]["message_channel"]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          organization_id?: string
          started_at?: string
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_sends: {
        Row: {
          batch_id: string | null
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          id: string
          lead_id: string
          sent_by: string
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
          template_used: string | null
        }
        Insert: {
          batch_id?: string | null
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          lead_id: string
          sent_by: string
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          template_used?: string | null
        }
        Update: {
          batch_id?: string | null
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          lead_id?: string
          sent_by?: string
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_sends_batch_fk"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "message_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          attachment_mime_type: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size_bytes: number | null
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size_bytes?: number | null
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size_bytes?: number | null
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          onboarding_intent: string | null
          plan_tier: Database["public"]["Enums"]["org_plan_tier"]
          seats_included: number
          seats_purchased: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          onboarding_intent?: string | null
          plan_tier?: Database["public"]["Enums"]["org_plan_tier"]
          seats_included?: number
          seats_purchased?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_intent?: string | null
          plan_tier?: Database["public"]["Enums"]["org_plan_tier"]
          seats_included?: number
          seats_purchased?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paisa: number
          created_at: string
          currency: string
          event_id: string | null
          gst_invoice_url: string | null
          id: string
          organization_id: string
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          trigger_source: Database["public"]["Enums"]["upgrade_trigger"] | null
        }
        Insert: {
          amount_paisa: number
          created_at?: string
          currency?: string
          event_id?: string | null
          gst_invoice_url?: string | null
          id?: string
          organization_id: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          trigger_source?: Database["public"]["Enums"]["upgrade_trigger"] | null
        }
        Update: {
          amount_paisa?: number
          created_at?: string
          currency?: string
          event_id?: string | null
          gst_invoice_url?: string | null
          id?: string
          organization_id?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          trigger_source?: Database["public"]["Enums"]["upgrade_trigger"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          notifications_enabled: boolean
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email: string
          full_name: string
          id: string
          notifications_enabled?: boolean
          organization_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          notifications_enabled?: boolean
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paisa: number
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          plan: Database["public"]["Enums"]["org_plan_tier"]
          provider: string
          provider_subscription_id: string | null
          seats: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          amount_paisa: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start: string
          id?: string
          organization_id: string
          plan?: Database["public"]["Enums"]["org_plan_tier"]
          provider?: string
          provider_subscription_id?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          amount_paisa?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          plan?: Database["public"]["Enums"]["org_plan_tier"]
          provider?: string
          provider_subscription_id?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_events: {
        Row: {
          action: Database["public"]["Enums"]["upgrade_action"]
          created_at: string
          id: string
          organization_id: string
          profile_id: string
          trigger: Database["public"]["Enums"]["upgrade_trigger"]
        }
        Insert: {
          action: Database["public"]["Enums"]["upgrade_action"]
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
          trigger: Database["public"]["Enums"]["upgrade_trigger"]
        }
        Update: {
          action?: Database["public"]["Enums"]["upgrade_action"]
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
          trigger?: Database["public"]["Enums"]["upgrade_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_notes: {
        Row: {
          audio_path: string
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string
          recorded_by: string
          summary: string | null
          transcribed_at: string | null
          transcript: string | null
          transcription_status: Database["public"]["Enums"]["transcription_status"]
        }
        Insert: {
          audio_path: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          recorded_by: string
          summary?: string | null
          transcribed_at?: string | null
          transcript?: string | null
          transcription_status?: Database["public"]["Enums"]["transcription_status"]
        }
        Update: {
          audio_path?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          recorded_by?: string
          summary?: string | null
          transcribed_at?: string | null
          transcript?: string | null
          transcription_status?: Database["public"]["Enums"]["transcription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_notes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_deletion_preview: { Args: never; Returns: Json }
      active_event_count: { Args: never; Returns: number }
      business_card_slug_available: {
        Args: { p_slug: string }
        Returns: boolean
      }
      can_use_ai: { Args: never; Returns: boolean }
      current_organization_id: { Args: never; Returns: string }
      event_hourly_capture: {
        Args: { p_day?: string; p_event_id: string }
        Returns: {
          hour_of_day: number
          lead_count: number
        }[]
      }
      event_leaderboard: {
        Args: { p_event_id: string }
        Returns: {
          deals_won: number
          full_name: string
          lead_count: number
          profile_id: string
        }[]
      }
      event_leaderboard_visible: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      event_organization_id: { Args: { p_event_id: string }; Returns: string }
      event_stats: {
        Args: { p_event_id: string }
        Returns: {
          consent_given: number
          count_contacted: number
          count_lost: number
          count_new: number
          count_qualified: number
          count_won: number
          deals_won: number
          leads_today: number
          needs_note: number
          spend_paisa: number
          total_leads: number
          with_voice_note: number
          won_value_paisa: number
        }[]
      }
      find_duplicate_lead: {
        Args: { p_event_id: string; p_phone: string }
        Returns: {
          captured_at: string
          captured_by: string
          captured_by_name: string
          lead_id: string
          note: string
          voice_summary: string
        }[]
      }
      is_active_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_pro_user: { Args: never; Returns: boolean }
      peek_invite: {
        Args: { p_token: string }
        Returns: {
          event_name: string
          expires_at: string
          invite_role: Database["public"]["Enums"]["user_role"]
          invited_name: string
          inviter_name: string
          is_valid: boolean
          organization_name: string
        }[]
      }
      perform_account_deletion: { Args: never; Returns: Json }
      set_default_message_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      suggest_card_slug: { Args: { p_base: string }; Returns: string }
    }
    Enums: {
      activity_type:
        | "captured"
        | "assigned"
        | "reassigned"
        | "status_changed"
        | "temperature_set"
        | "note_added"
        | "follow_up_set"
        | "outcome_logged"
        | "message_sent"
        | "merged_duplicate"
      billing_cycle: "annual" | "single_event"
      custom_field_type: "text" | "number" | "dropdown" | "checkbox" | "radio"
      event_status: "upcoming" | "live" | "closed"
      extraction_status: "pending" | "completed" | "failed"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      lead_outcome: "connected" | "no_answer" | "not_interested" | "meeting_set"
      lead_source: "card_scan" | "manual"
      lead_status: "new" | "contacted" | "qualified" | "won" | "lost"
      lead_temperature: "hot" | "warm" | "cold"
      member_status: "invited" | "active" | "deactivated"
      message_channel: "whatsapp" | "email"
      message_status: "queued" | "sent" | "skipped" | "failed"
      org_plan_tier: "free" | "pro"
      payment_status: "pending" | "success" | "failed" | "refunded"
      subscription_status: "active" | "past_due" | "canceled" | "incomplete"
      transcription_status: "pending" | "processing" | "completed" | "failed"
      upgrade_action: "shown" | "dismissed" | "upgraded"
      upgrade_trigger:
        | "lead_wall"
        | "voice_lock"
        | "roi_curiosity"
        | "second_person"
        | "sales_manual"
      user_role: "admin" | "rep"
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
      activity_type: [
        "captured",
        "assigned",
        "reassigned",
        "status_changed",
        "temperature_set",
        "note_added",
        "follow_up_set",
        "outcome_logged",
        "message_sent",
        "merged_duplicate",
      ],
      billing_cycle: ["annual", "single_event"],
      custom_field_type: ["text", "number", "dropdown", "checkbox", "radio"],
      event_status: ["upcoming", "live", "closed"],
      extraction_status: ["pending", "completed", "failed"],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      lead_outcome: ["connected", "no_answer", "not_interested", "meeting_set"],
      lead_source: ["card_scan", "manual"],
      lead_status: ["new", "contacted", "qualified", "won", "lost"],
      lead_temperature: ["hot", "warm", "cold"],
      member_status: ["invited", "active", "deactivated"],
      message_channel: ["whatsapp", "email"],
      message_status: ["queued", "sent", "skipped", "failed"],
      org_plan_tier: ["free", "pro"],
      payment_status: ["pending", "success", "failed", "refunded"],
      subscription_status: ["active", "past_due", "canceled", "incomplete"],
      transcription_status: ["pending", "processing", "completed", "failed"],
      upgrade_action: ["shown", "dismissed", "upgraded"],
      upgrade_trigger: [
        "lead_wall",
        "voice_lock",
        "roi_curiosity",
        "second_person",
        "sales_manual",
      ],
      user_role: ["admin", "rep"],
    },
  },
} as const
