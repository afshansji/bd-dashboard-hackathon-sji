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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accountability_activities: {
        Row: {
          created_at: string
          current_count: number
          description: string | null
          frequency: Database["public"]["Enums"]["activity_frequency"]
          id: string
          linked_task_id: string | null
          rep_goal_id: string
          status: Database["public"]["Enums"]["activity_status"]
          target_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          description?: string | null
          frequency?: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          linked_task_id?: string | null
          rep_goal_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          target_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_count?: number
          description?: string | null
          frequency?: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          linked_task_id?: string | null
          rep_goal_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          target_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_activities_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_activities_rep_goal_id_fkey"
            columns: ["rep_goal_id"]
            isOneToOne: false
            referencedRelation: "accountability_rep_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_chart: {
        Row: {
          created_at: string
          id: string
          position: string
          reports_to: string | null
          responsibilities: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: string
          reports_to?: string | null
          responsibilities?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: string
          reports_to?: string | null
          responsibilities?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accountability_quarters: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["quarter_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["quarter_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["quarter_status"]
          updated_at?: string
        }
        Relationships: []
      }
      accountability_rep_goals: {
        Row: {
          approval_status: Database["public"]["Enums"]["goal_approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_value: number
          description: string | null
          id: string
          quarter_id: string
          rejection_reason: string | null
          rep_id: string
          status: Database["public"]["Enums"]["goal_status"]
          target_unit: string
          target_value: number
          team_goal_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["goal_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          quarter_id: string
          rejection_reason?: string | null
          rep_id: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit: string
          target_value: number
          team_goal_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["goal_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          quarter_id?: string
          rejection_reason?: string | null
          rep_id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string
          target_value?: number
          team_goal_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_rep_goals_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "accountability_quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_rep_goals_team_goal_id_fkey"
            columns: ["team_goal_id"]
            isOneToOne: false
            referencedRelation: "accountability_team_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_team_goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          id: string
          quarter_id: string
          status: Database["public"]["Enums"]["goal_status"]
          target_unit: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          id?: string
          quarter_id: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          id?: string
          quarter_id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_team_goals_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "accountability_quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_weekly_updates: {
        Row: {
          activity_id: string
          blockers: string | null
          created_at: string
          help_needed: string | null
          id: string
          notes: string | null
          progress_percentage: number
          progress_value: number
          status: Database["public"]["Enums"]["goal_status"]
          submitted_by: string
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          activity_id: string
          blockers?: string | null
          created_at?: string
          help_needed?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number
          progress_value?: number
          status?: Database["public"]["Enums"]["goal_status"]
          submitted_by: string
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          activity_id?: string
          blockers?: string | null
          created_at?: string
          help_needed?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number
          progress_value?: number
          status?: Database["public"]["Enums"]["goal_status"]
          submitted_by?: string
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_weekly_updates_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "accountability_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          access_count: number | null
          agent_id: string
          consolidated: boolean | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance_score: number | null
          is_active: boolean | null
          last_accessed_at: string | null
          memory_category: string | null
          memory_type: string
          source_id: string | null
          source_type: string | null
          summary: string | null
          superseded_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          agent_id: string
          consolidated?: boolean | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_category?: string | null
          memory_type?: string
          source_id?: string | null
          source_type?: string | null
          summary?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          agent_id?: string
          consolidated?: boolean | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_category?: string | null
          memory_type?: string
          source_id?: string | null
          source_type?: string | null
          summary?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "agent_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          latency_ms: number | null
          metadata: Json | null
          model_used: string | null
          provider_used: string | null
          role: string
          tokens_input: number | null
          tokens_output: number | null
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          provider_used?: string | null
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          provider_used?: string | null
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_views: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_views_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          agent_id: string | null
          ai_summary: Json | null
          category: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          error_message: string | null
          executed_by: string | null
          execution_context: Json | null
          generated_tasks: Json | null
          id: string
          input: Json | null
          output: Json | null
          provider_chain: Json | null
          selected_file_ids: string[] | null
          started_at: string
          status: string | null
          structured_output: Json | null
          title: string | null
          user_context: string | null
        }
        Insert: {
          agent_id?: string | null
          ai_summary?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          error_message?: string | null
          executed_by?: string | null
          execution_context?: Json | null
          generated_tasks?: Json | null
          id?: string
          input?: Json | null
          output?: Json | null
          provider_chain?: Json | null
          selected_file_ids?: string[] | null
          started_at?: string
          status?: string | null
          structured_output?: Json | null
          title?: string | null
          user_context?: string | null
        }
        Update: {
          agent_id?: string | null
          ai_summary?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          error_message?: string | null
          executed_by?: string | null
          execution_context?: Json | null
          generated_tasks?: Json | null
          id?: string
          input?: Json | null
          output?: Json | null
          provider_chain?: Json | null
          selected_file_ids?: string[] | null
          started_at?: string
          status?: string | null
          structured_output?: Json | null
          title?: string | null
          user_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          model: string | null
          name: string
          provider: string
          template_config: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          model?: string | null
          name: string
          provider: string
          template_config: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          model?: string | null
          name?: string
          provider?: string
          template_config?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          avatar: string | null
          benefits: Json | null
          category: string | null
          config: Json | null
          conversation_starters: Json | null
          created_at: string
          created_by: string | null
          data_source_config: Json | null
          data_sources: Json | null
          description: string | null
          file_selection_config: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_enabled: boolean | null
          last_run_at: string | null
          memory_enabled: boolean | null
          metadata: Json | null
          min_role_required: Database["public"]["Enums"]["app_role"] | null
          name: string
          output_actions: Json | null
          prompt_template: string | null
          provider_config: Json | null
          schedule_config: Json | null
          slug: string | null
          success_rate: number | null
          system_prompt: string | null
          type: string
          updated_at: string
          usage_count: number | null
          usage_location: string | null
          usage_route: string | null
          use_cases: Json | null
          welcome_message: string | null
        }
        Insert: {
          avatar?: string | null
          benefits?: Json | null
          category?: string | null
          config?: Json | null
          conversation_starters?: Json | null
          created_at?: string
          created_by?: string | null
          data_source_config?: Json | null
          data_sources?: Json | null
          description?: string | null
          file_selection_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_enabled?: boolean | null
          last_run_at?: string | null
          memory_enabled?: boolean | null
          metadata?: Json | null
          min_role_required?: Database["public"]["Enums"]["app_role"] | null
          name: string
          output_actions?: Json | null
          prompt_template?: string | null
          provider_config?: Json | null
          schedule_config?: Json | null
          slug?: string | null
          success_rate?: number | null
          system_prompt?: string | null
          type: string
          updated_at?: string
          usage_count?: number | null
          usage_location?: string | null
          usage_route?: string | null
          use_cases?: Json | null
          welcome_message?: string | null
        }
        Update: {
          avatar?: string | null
          benefits?: Json | null
          category?: string | null
          config?: Json | null
          conversation_starters?: Json | null
          created_at?: string
          created_by?: string | null
          data_source_config?: Json | null
          data_sources?: Json | null
          description?: string | null
          file_selection_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_enabled?: boolean | null
          last_run_at?: string | null
          memory_enabled?: boolean | null
          metadata?: Json | null
          min_role_required?: Database["public"]["Enums"]["app_role"] | null
          name?: string
          output_actions?: Json | null
          prompt_template?: string | null
          provider_config?: Json | null
          schedule_config?: Json | null
          slug?: string | null
          success_rate?: number | null
          system_prompt?: string | null
          type?: string
          updated_at?: string
          usage_count?: number | null
          usage_location?: string | null
          usage_route?: string | null
          use_cases?: Json | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      ai_business_context: {
        Row: {
          context_type: string
          created_at: string | null
          created_by: string | null
          data: Json
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          context_type: string
          created_at?: string | null
          created_by?: string | null
          data: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          data?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_configurations: {
        Row: {
          configuration_data: Json
          configuration_type: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration_data?: Json
          configuration_type: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration_data?: Json
          configuration_type?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_api_consumers: {
        Row: {
          allowed_periods: string[]
          api_secret_hash: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_push_at: string | null
          last_push_status: string | null
          name: string
          push_enabled: boolean
          push_frequency: string
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_periods?: string[]
          api_secret_hash: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_push_at?: string | null
          last_push_status?: string | null
          name: string
          push_enabled?: boolean
          push_frequency?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_periods?: string[]
          api_secret_hash?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_push_at?: string | null
          last_push_status?: string | null
          name?: string
          push_enabled?: boolean
          push_frequency?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      analytics_data: {
        Row: {
          created_at: string | null
          dimensions: Json | null
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
          source: string
        }
        Insert: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
          source: string
        }
        Update: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
          source?: string
        }
        Relationships: []
      }
      auth_sync_errors: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          raw_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          raw_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          raw_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      bd_campaigns: {
        Row: {
          actual_contacts_reached: number | null
          brand_id: string | null
          campaign_objective: string | null
          campaign_type: string
          campaign_types: string[] | null
          created_at: string
          created_by: string | null
          deals_generated: number | null
          end_date: string | null
          id: string
          meetings_booked: number | null
          name: string
          niche_id: string
          owned_by: string | null
          responses_received: number | null
          slug: string | null
          start_date: string | null
          status: string
          target_contacts: string[] | null
          target_contacts_count: number | null
          target_regions: string[] | null
          updated_at: string
        }
        Insert: {
          actual_contacts_reached?: number | null
          brand_id?: string | null
          campaign_objective?: string | null
          campaign_type: string
          campaign_types?: string[] | null
          created_at?: string
          created_by?: string | null
          deals_generated?: number | null
          end_date?: string | null
          id?: string
          meetings_booked?: number | null
          name: string
          niche_id: string
          owned_by?: string | null
          responses_received?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string
          target_contacts?: string[] | null
          target_contacts_count?: number | null
          target_regions?: string[] | null
          updated_at?: string
        }
        Update: {
          actual_contacts_reached?: number | null
          brand_id?: string | null
          campaign_objective?: string | null
          campaign_type?: string
          campaign_types?: string[] | null
          created_at?: string
          created_by?: string | null
          deals_generated?: number | null
          end_date?: string | null
          id?: string
          meetings_booked?: number | null
          name?: string
          niche_id?: string
          owned_by?: string | null
          responses_received?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string
          target_contacts?: string[] | null
          target_contacts_count?: number | null
          target_regions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_campaigns_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "target_niches"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_weekly_reports: {
        Row: {
          ai_insights: string[] | null
          coaching_recommendations: Json | null
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          quarter: string
          rep_performance: Json
          report_status: string | null
          risk_alerts: string[] | null
          sent_at: string | null
          sent_to: string[] | null
          summary: string
          team_health_score: number | null
          team_metrics: Json
          updated_at: string | null
          week_end_date: string
          week_start_date: string
          wig_agenda: Json
        }
        Insert: {
          ai_insights?: string[] | null
          coaching_recommendations?: Json | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          quarter: string
          rep_performance: Json
          report_status?: string | null
          risk_alerts?: string[] | null
          sent_at?: string | null
          sent_to?: string[] | null
          summary: string
          team_health_score?: number | null
          team_metrics: Json
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
          wig_agenda: Json
        }
        Update: {
          ai_insights?: string[] | null
          coaching_recommendations?: Json | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          quarter?: string
          rep_performance?: Json
          report_status?: string | null
          risk_alerts?: string[] | null
          sent_at?: string | null
          sent_to?: string[] | null
          summary?: string
          team_health_score?: number | null
          team_metrics?: Json
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
          wig_agenda?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bd_weekly_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_integrations: {
        Row: {
          brand_id: string
          config: Json | null
          created_at: string
          id: string
          integration_type: string
          is_enabled: boolean
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_type: string
          is_enabled?: boolean
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_integrations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kpis: {
        Row: {
          brand_id: string
          created_at: string
          current_value: number | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          kpi_type: string
          metadata: Json | null
          name: string
          source: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          kpi_type?: string
          metadata?: Json | null
          name: string
          source?: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          kpi_type?: string
          metadata?: Json | null
          name?: string
          source?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kpis_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          metadata: Json | null
          monthly_budget: number | null
          name: string
          owner_id: string | null
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json | null
          monthly_budget?: number | null
          name: string
          owner_id?: string | null
          slug: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json | null
          monthly_budget?: number | null
          name?: string
          owner_id?: string | null
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_brands: {
        Row: {
          brand_id: string
          campaign_id: string
          created_at: string
          id: string
        }
        Insert: {
          brand_id: string
          campaign_id: string
          created_at?: string
          id?: string
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_brands_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contact_comments: {
        Row: {
          comment: string
          contact_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          contact_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          contact_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contact_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contact_linkedin_messages: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          follow_up_strategy: string | null
          generated_by: string | null
          generation_context: Json | null
          id: string
          message_type: string
          message_variants: Json
          notes: string | null
          reasoning: string | null
          recommended_variant: string
          response_received: boolean | null
          response_received_at: string | null
          response_type: string | null
          send_timing_suggestion: string | null
          sent_at: string | null
          sequence_id: string | null
          sequence_step_order: number | null
          updated_at: string | null
          user_context: string | null
          variant_sent: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          follow_up_strategy?: string | null
          generated_by?: string | null
          generation_context?: Json | null
          id?: string
          message_type: string
          message_variants: Json
          notes?: string | null
          reasoning?: string | null
          recommended_variant: string
          response_received?: boolean | null
          response_received_at?: string | null
          response_type?: string | null
          send_timing_suggestion?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          sequence_step_order?: number | null
          updated_at?: string | null
          user_context?: string | null
          variant_sent?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          follow_up_strategy?: string | null
          generated_by?: string | null
          generation_context?: Json | null
          id?: string
          message_type?: string
          message_variants?: Json
          notes?: string | null
          reasoning?: string | null
          recommended_variant?: string
          response_received?: boolean | null
          response_received_at?: string | null
          response_type?: string | null
          send_timing_suggestion?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          sequence_step_order?: number | null
          updated_at?: string | null
          user_context?: string | null
          variant_sent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contact_linkedin_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contact_linkedin_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contact_status_history: {
        Row: {
          change_trigger: string
          changed_at: string
          changed_by: string | null
          contact_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          change_trigger?: string
          changed_at?: string
          changed_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          change_trigger?: string
          changed_at?: string
          changed_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contact_status_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          auto_status_enabled: boolean | null
          campaign_id: string
          company_description: string | null
          company_founded_year: number | null
          company_headquarters: string | null
          company_industry: string | null
          company_linkedin_url: string | null
          company_size: string | null
          company_website: string | null
          contact_company: string | null
          contact_email: string | null
          contact_linkedin_url: string | null
          contact_name: string
          contact_phone: string | null
          contact_title: string | null
          created_at: string
          current_employer: string | null
          current_position_start_date: string | null
          current_position_title: string | null
          education_summary: string | null
          exa_item_id: string | null
          exa_score: number | null
          highest_degree: string | null
          id: string
          industry_focus: string | null
          languages: string[] | null
          last_enriched_at: string | null
          last_linkedin_activity_date: string | null
          last_status_change_at: string | null
          lead_quality_score: number | null
          linkedin_about: string | null
          linkedin_connection_count: number | null
          linkedin_follower_count: number | null
          linkedin_headline: string | null
          linkedin_location: string | null
          linkedin_profile_image_url: string | null
          linkedin_skills: string[] | null
          metadata: Json | null
          previous_employers: string[] | null
          profile_completeness_score: number | null
          research_summary: Json | null
          slug: string | null
          status: string
          tag_colors: Json | null
          tags: string[] | null
          total_years_experience: number | null
          updated_at: string
          years_in_current_role: number | null
        }
        Insert: {
          auto_status_enabled?: boolean | null
          campaign_id: string
          company_description?: string | null
          company_founded_year?: number | null
          company_headquarters?: string | null
          company_industry?: string | null
          company_linkedin_url?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_linkedin_url?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          current_employer?: string | null
          current_position_start_date?: string | null
          current_position_title?: string | null
          education_summary?: string | null
          exa_item_id?: string | null
          exa_score?: number | null
          highest_degree?: string | null
          id?: string
          industry_focus?: string | null
          languages?: string[] | null
          last_enriched_at?: string | null
          last_linkedin_activity_date?: string | null
          last_status_change_at?: string | null
          lead_quality_score?: number | null
          linkedin_about?: string | null
          linkedin_connection_count?: number | null
          linkedin_follower_count?: number | null
          linkedin_headline?: string | null
          linkedin_location?: string | null
          linkedin_profile_image_url?: string | null
          linkedin_skills?: string[] | null
          metadata?: Json | null
          previous_employers?: string[] | null
          profile_completeness_score?: number | null
          research_summary?: Json | null
          slug?: string | null
          status?: string
          tag_colors?: Json | null
          tags?: string[] | null
          total_years_experience?: number | null
          updated_at?: string
          years_in_current_role?: number | null
        }
        Update: {
          auto_status_enabled?: boolean | null
          campaign_id?: string
          company_description?: string | null
          company_founded_year?: number | null
          company_headquarters?: string | null
          company_industry?: string | null
          company_linkedin_url?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_linkedin_url?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          current_employer?: string | null
          current_position_start_date?: string | null
          current_position_title?: string | null
          education_summary?: string | null
          exa_item_id?: string | null
          exa_score?: number | null
          highest_degree?: string | null
          id?: string
          industry_focus?: string | null
          languages?: string[] | null
          last_enriched_at?: string | null
          last_linkedin_activity_date?: string | null
          last_status_change_at?: string | null
          lead_quality_score?: number | null
          linkedin_about?: string | null
          linkedin_connection_count?: number | null
          linkedin_follower_count?: number | null
          linkedin_headline?: string | null
          linkedin_location?: string | null
          linkedin_profile_image_url?: string | null
          linkedin_skills?: string[] | null
          metadata?: Json | null
          previous_employers?: string[] | null
          profile_completeness_score?: number | null
          research_summary?: Json | null
          slug?: string | null
          status?: string
          tag_colors?: Json | null
          tags?: string[] | null
          total_years_experience?: number | null
          updated_at?: string
          years_in_current_role?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_emails: {
        Row: {
          bcc_emails: string[] | null
          body: string
          bounced_at: string | null
          campaign_id: string
          cc_emails: string[] | null
          clicked_at: string | null
          contact_id: string
          created_at: string | null
          id: string
          opened_at: string | null
          sendgrid_message_id: string | null
          sent_at: string | null
          sent_by: string
          status: string | null
          subject: string
          to_email: string
          updated_at: string | null
        }
        Insert: {
          bcc_emails?: string[] | null
          body: string
          bounced_at?: string | null
          campaign_id: string
          cc_emails?: string[] | null
          clicked_at?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          opened_at?: string | null
          sendgrid_message_id?: string | null
          sent_at?: string | null
          sent_by: string
          status?: string | null
          subject: string
          to_email: string
          updated_at?: string | null
        }
        Update: {
          bcc_emails?: string[] | null
          body?: string
          bounced_at?: string | null
          campaign_id?: string
          cc_emails?: string[] | null
          clicked_at?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          opened_at?: string | null
          sendgrid_message_id?: string | null
          sent_at?: string | null
          sent_by?: string
          status?: string | null
          subject?: string
          to_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_financial_data: {
        Row: {
          actual_spend: number | null
          average_deal_value: number | null
          campaign_id: string | null
          cost_per_contact: number | null
          cost_per_deal: number | null
          cost_per_meeting: number | null
          created_at: string | null
          deals_revenue: number | null
          id: string
          last_calculated_at: string | null
          projected_revenue: number | null
          roi_percentage: number | null
          total_budget: number | null
          updated_at: string | null
        }
        Insert: {
          actual_spend?: number | null
          average_deal_value?: number | null
          campaign_id?: string | null
          cost_per_contact?: number | null
          cost_per_deal?: number | null
          cost_per_meeting?: number | null
          created_at?: string | null
          deals_revenue?: number | null
          id?: string
          last_calculated_at?: string | null
          projected_revenue?: number | null
          roi_percentage?: number | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_spend?: number | null
          average_deal_value?: number | null
          campaign_id?: string | null
          cost_per_contact?: number | null
          cost_per_deal?: number | null
          cost_per_meeting?: number | null
          created_at?: string | null
          deals_revenue?: number | null
          id?: string
          last_calculated_at?: string | null
          projected_revenue?: number | null
          roi_percentage?: number | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_financial_data_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_kpis: {
        Row: {
          campaign_id: string
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          name: string
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          name: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          name?: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kpis_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_research: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          payload: Json
          provider: string | null
          query: string | null
          requested_at: string
          research_type: string
          results: Json
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          provider?: string | null
          query?: string | null
          requested_at?: string
          research_type: string
          results?: Json
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          provider?: string | null
          query?: string | null
          requested_at?: string
          research_type?: string
          results?: Json
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_research_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequences: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          trigger_condition: Json | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          trigger_condition?: Json | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_condition?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_tags: {
        Row: {
          campaign_id: string
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          tag_name: string
          usage_count: number | null
        }
        Insert: {
          campaign_id: string
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_name: string
          usage_count?: number | null
        }
        Update: {
          campaign_id?: string
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_name?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          id: string
          order_index: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          items: Json | null
          name: string
          stage: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json | null
          name: string
          stage?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json | null
          name?: string
          stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_intelligence_sessions: {
        Row: {
          agent_run_id: string | null
          client_id: string
          cost_estimate: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_archived: boolean | null
          mode: string | null
          processing_time_ms: number | null
          question: string
          response_data: Json
          tags: string[] | null
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_run_id?: string | null
          client_id: string
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          mode?: string | null
          processing_time_ms?: number | null
          question: string
          response_data?: Json
          tags?: string[] | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_run_id?: string | null
          client_id?: string
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          mode?: string | null
          processing_time_ms?: number | null
          question?: string
          response_data?: Json
          tags?: string[] | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_intelligence_sessions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_intelligence_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          brand_id: string | null
          city: string | null
          company: string | null
          contact_person: string | null
          control_tower_id: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          employee_count: number | null
          gohighlevel_contact_id: string | null
          gohighlevel_last_synced_at: string | null
          hubspot_id: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          last_researched_at: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          research_summary: Json | null
          revenue: number | null
          slug: string | null
          specialties: string[] | null
          state: string | null
          status: string | null
          technologies: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          control_tower_id?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employee_count?: number | null
          gohighlevel_contact_id?: string | null
          gohighlevel_last_synced_at?: string | null
          hubspot_id?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          last_researched_at?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          research_summary?: Json | null
          revenue?: number | null
          slug?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          technologies?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          control_tower_id?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employee_count?: number | null
          gohighlevel_contact_id?: string | null
          gohighlevel_last_synced_at?: string | null
          hubspot_id?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          last_researched_at?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          research_summary?: Json | null
          revenue?: number | null
          slug?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          technologies?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_sequence_enrollments: {
        Row: {
          batch_config: Json | null
          contact_id: string
          created_at: string
          current_step: number
          current_step_id: string | null
          email_template_id: string | null
          enrolled_at: string
          exit_reason: string | null
          id: string
          last_step_executed_at: string | null
          metadata: Json | null
          next_batch_at: string | null
          next_step_scheduled_at: string | null
          scheduling_mode: string | null
          send_days: string[] | null
          sequence_id: string
          start_date_time: string | null
          status: string
          time_window_end: string | null
          time_window_start: string | null
          total_sent: number | null
          total_to_send: number | null
          updated_at: string
        }
        Insert: {
          batch_config?: Json | null
          contact_id: string
          created_at?: string
          current_step?: number
          current_step_id?: string | null
          email_template_id?: string | null
          enrolled_at?: string
          exit_reason?: string | null
          id?: string
          last_step_executed_at?: string | null
          metadata?: Json | null
          next_batch_at?: string | null
          next_step_scheduled_at?: string | null
          scheduling_mode?: string | null
          send_days?: string[] | null
          sequence_id: string
          start_date_time?: string | null
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          total_sent?: number | null
          total_to_send?: number | null
          updated_at?: string
        }
        Update: {
          batch_config?: Json | null
          contact_id?: string
          created_at?: string
          current_step?: number
          current_step_id?: string | null
          email_template_id?: string | null
          enrolled_at?: string
          exit_reason?: string | null
          id?: string
          last_step_executed_at?: string | null
          metadata?: Json | null
          next_batch_at?: string | null
          next_step_scheduled_at?: string | null
          scheduling_mode?: string | null
          send_days?: string[] | null
          sequence_id?: string
          start_date_time?: string | null
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          total_sent?: number | null
          total_to_send?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sequence_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sequence_enrollments_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "campaign_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          hubspot_id: string | null
          id: string
          last_name: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hubspot_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hubspot_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      control_tower_alert_config: {
        Row: {
          alert_type: string
          auto_resolve_after_hours: number | null
          check_interval_minutes: number
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          notification_channels: Json | null
          notification_recipients: Json | null
          severity_threshold: string
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          auto_resolve_after_hours?: number | null
          check_interval_minutes?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          notification_channels?: Json | null
          notification_recipients?: Json | null
          severity_threshold?: string
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          auto_resolve_after_hours?: number | null
          check_interval_minutes?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          notification_channels?: Json | null
          notification_recipients?: Json | null
          severity_threshold?: string
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      control_tower_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          triggered_at?: string
        }
        Relationships: []
      }
      control_tower_health_snapshots: {
        Row: {
          api_response_time_ms: number | null
          avg_sync_duration_ms: number | null
          created_at: string
          data_drift_score: number | null
          failed_syncs_count_24h: number | null
          id: string
          last_successful_pull: string | null
          last_successful_push: string | null
          metrics_detail: Json | null
          overall_health_score: number
          pending_push_items: number | null
          snapshot_at: string
          stale_deals_count: number | null
          sync_success_rate_24h: number | null
          sync_success_rate_7d: number | null
          unmapped_owners_count: number | null
          unmapped_pms_count: number | null
          unmapped_pods_count: number | null
        }
        Insert: {
          api_response_time_ms?: number | null
          avg_sync_duration_ms?: number | null
          created_at?: string
          data_drift_score?: number | null
          failed_syncs_count_24h?: number | null
          id?: string
          last_successful_pull?: string | null
          last_successful_push?: string | null
          metrics_detail?: Json | null
          overall_health_score: number
          pending_push_items?: number | null
          snapshot_at?: string
          stale_deals_count?: number | null
          sync_success_rate_24h?: number | null
          sync_success_rate_7d?: number | null
          unmapped_owners_count?: number | null
          unmapped_pms_count?: number | null
          unmapped_pods_count?: number | null
        }
        Update: {
          api_response_time_ms?: number | null
          avg_sync_duration_ms?: number | null
          created_at?: string
          data_drift_score?: number | null
          failed_syncs_count_24h?: number | null
          id?: string
          last_successful_pull?: string | null
          last_successful_push?: string | null
          metrics_detail?: Json | null
          overall_health_score?: number
          pending_push_items?: number | null
          snapshot_at?: string
          stale_deals_count?: number | null
          sync_success_rate_24h?: number | null
          sync_success_rate_7d?: number | null
          unmapped_owners_count?: number | null
          unmapped_pms_count?: number | null
          unmapped_pods_count?: number | null
        }
        Relationships: []
      }
      control_tower_sync_log: {
        Row: {
          control_tower_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          payload: Json | null
          status: string
          sync_type: string
          synced_at: string
          synced_by: string | null
        }
        Insert: {
          control_tower_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          status: string
          sync_type: string
          synced_at?: string
          synced_by?: string | null
        }
        Update: {
          control_tower_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          status?: string
          sync_type?: string
          synced_at?: string
          synced_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sync_log_synced_by"
            columns: ["synced_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      control_tower_sync_state: {
        Row: {
          created_at: string
          deals_synced: number | null
          id: string
          last_successful_sync_at: string
          last_sync_error: string | null
          last_sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deals_synced?: number | null
          id?: string
          last_successful_sync_at?: string
          last_sync_error?: string | null
          last_sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deals_synced?: number | null
          id?: string
          last_successful_sync_at?: string
          last_sync_error?: string | null
          last_sync_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      control_tower_user_mappings: {
        Row: {
          control_tower_email: string
          control_tower_name: string | null
          control_tower_user_id: string
          created_at: string | null
          id: string
          local_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          control_tower_email: string
          control_tower_name?: string | null
          control_tower_user_id: string
          created_at?: string | null
          id?: string
          local_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          control_tower_email?: string
          control_tower_name?: string | null
          control_tower_user_id?: string
          created_at?: string | null
          id?: string
          local_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_tower_user_mappings_local_user_id_fkey"
            columns: ["local_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          control_tower_item_id: string | null
          created_at: string
          deal_id: string
          id: string
          is_completed: boolean
          order_index: number
          synced_to_control_tower: boolean
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          control_tower_item_id?: string | null
          created_at?: string
          deal_id: string
          id?: string
          is_completed?: boolean
          order_index?: number
          synced_to_control_tower?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          control_tower_item_id?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          is_completed?: boolean
          order_index?: number
          synced_to_control_tower?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_checklist_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comments: {
        Row: {
          comment: string
          created_at: string
          deal_id: string
          id: string
          mentioned_user_emails: string[] | null
          mentioned_users: string[] | null
          synced_to_control_tower: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          deal_id: string
          id?: string
          mentioned_user_emails?: string[] | null
          mentioned_users?: string[] | null
          synced_to_control_tower?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          deal_id?: string
          id?: string
          mentioned_user_emails?: string[] | null
          mentioned_users?: string[] | null
          synced_to_control_tower?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_detail_attachments: {
        Row: {
          created_at: string
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_detail_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_files: {
        Row: {
          category: string | null
          checksum: string | null
          client_id: string | null
          created_at: string
          deal_id: string | null
          drive_created_at: string | null
          drive_file_id: string | null
          drive_file_name: string | null
          drive_file_type: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          drive_last_modified_at: string | null
          file_size: number | null
          id: string
          json_snapshot_path: string | null
          metadata: Json | null
          storage_bucket_path: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          checksum?: string | null
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          drive_created_at?: string | null
          drive_file_id?: string | null
          drive_file_name?: string | null
          drive_file_type?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          drive_last_modified_at?: string | null
          file_size?: number | null
          id?: string
          json_snapshot_path?: string | null
          metadata?: Json | null
          storage_bucket_path?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          checksum?: string | null
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          drive_created_at?: string | null
          drive_file_id?: string | null
          drive_file_name?: string | null
          drive_file_type?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          drive_last_modified_at?: string | null
          file_size?: number | null
          id?: string
          json_snapshot_path?: string | null
          metadata?: Json | null
          storage_bucket_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reminders: {
        Row: {
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          id: string
          message: string | null
          recipient_email: string
          recipient_id: string | null
          reminder_date: string
          reminder_type: string
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          message?: string | null
          recipient_email: string
          recipient_id?: string | null
          reminder_date: string
          reminder_type?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          message?: string | null
          recipient_email?: string
          recipient_id?: string | null
          reminder_date?: string
          reminder_type?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_reminders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_system_info: {
        Row: {
          created_at: string
          deal_id: string
          external_references: Json | null
          id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          external_references?: Json | null
          id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          external_references?: Json | null
          id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_system_info_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_deal_owner_email: string | null
          actual_deal_owner_id: string | null
          actual_deal_owner_name: string | null
          amount: number | null
          bd_rep_id: string | null
          brand_id: string | null
          category: string | null
          client: string | null
          client_agent_folder: string | null
          client_agent_url: string | null
          client_call_recording_link: string | null
          client_email: string | null
          client_estimate_doc_url: string | null
          client_id: string | null
          client_phone: string | null
          clientcompanyname: string | null
          clientemail: string | null
          clientfirstname: string | null
          clientlastname: string | null
          clientlinkedinbio: string | null
          clientphone: string | null
          clientwebsite: string | null
          close_date: string | null
          collaborative_ai: string | null
          collaborative_ai_link: string | null
          control_tower_client_id: string | null
          control_tower_id: string | null
          control_tower_metadata: Json | null
          control_tower_owner_id: string | null
          control_tower_status: string | null
          created_at: string
          created_date: string | null
          days_in_stage: number | null
          deal_details: string | null
          deal_name: string | null
          dealtype: string | null
          deleted_at: string | null
          estimate_task_link: string | null
          estimate_url: string | null
          expected_close_date: string | null
          expected_closing_date: string | null
          external_links: Json | null
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          hubspot_crm_deal_url: string | null
          hubspot_deal_id: string | null
          hubspot_owner_id: number | null
          id: string
          internal_estimate_doc_link: string | null
          internal_estimate_doc_url: string | null
          last_activity_by: string | null
          last_activity_date: string | null
          last_synced_at: string | null
          lead_source: string | null
          leadslift_crm_deal_url: string | null
          linkedin_profile_url: string | null
          lovable_url: string | null
          notes: string | null
          owner: string | null
          owner_id: string | null
          pandadoc_proposal_url: string | null
          pipeline: string | null
          pm_assigned_id: string | null
          pm_control_tower_id: string | null
          pod_assigned: string | null
          pod_id: string | null
          potential_amount: number | null
          priority: string | null
          probability: number | null
          slug: string | null
          stage: string | null
          status: string | null
          synced_from_control_tower: boolean | null
          tags: string[] | null
          title: string
          type_of_work: string | null
          updated_at: string
          value: number | null
          workboard_ai_link: string | null
        }
        Insert: {
          actual_deal_owner_email?: string | null
          actual_deal_owner_id?: string | null
          actual_deal_owner_name?: string | null
          amount?: number | null
          bd_rep_id?: string | null
          brand_id?: string | null
          category?: string | null
          client?: string | null
          client_agent_folder?: string | null
          client_agent_url?: string | null
          client_call_recording_link?: string | null
          client_email?: string | null
          client_estimate_doc_url?: string | null
          client_id?: string | null
          client_phone?: string | null
          clientcompanyname?: string | null
          clientemail?: string | null
          clientfirstname?: string | null
          clientlastname?: string | null
          clientlinkedinbio?: string | null
          clientphone?: string | null
          clientwebsite?: string | null
          close_date?: string | null
          collaborative_ai?: string | null
          collaborative_ai_link?: string | null
          control_tower_client_id?: string | null
          control_tower_id?: string | null
          control_tower_metadata?: Json | null
          control_tower_owner_id?: string | null
          control_tower_status?: string | null
          created_at?: string
          created_date?: string | null
          days_in_stage?: number | null
          deal_details?: string | null
          deal_name?: string | null
          dealtype?: string | null
          deleted_at?: string | null
          estimate_task_link?: string | null
          estimate_url?: string | null
          expected_close_date?: string | null
          expected_closing_date?: string | null
          external_links?: Json | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          hubspot_crm_deal_url?: string | null
          hubspot_deal_id?: string | null
          hubspot_owner_id?: number | null
          id?: string
          internal_estimate_doc_link?: string | null
          internal_estimate_doc_url?: string | null
          last_activity_by?: string | null
          last_activity_date?: string | null
          last_synced_at?: string | null
          lead_source?: string | null
          leadslift_crm_deal_url?: string | null
          linkedin_profile_url?: string | null
          lovable_url?: string | null
          notes?: string | null
          owner?: string | null
          owner_id?: string | null
          pandadoc_proposal_url?: string | null
          pipeline?: string | null
          pm_assigned_id?: string | null
          pm_control_tower_id?: string | null
          pod_assigned?: string | null
          pod_id?: string | null
          potential_amount?: number | null
          priority?: string | null
          probability?: number | null
          slug?: string | null
          stage?: string | null
          status?: string | null
          synced_from_control_tower?: boolean | null
          tags?: string[] | null
          title: string
          type_of_work?: string | null
          updated_at?: string
          value?: number | null
          workboard_ai_link?: string | null
        }
        Update: {
          actual_deal_owner_email?: string | null
          actual_deal_owner_id?: string | null
          actual_deal_owner_name?: string | null
          amount?: number | null
          bd_rep_id?: string | null
          brand_id?: string | null
          category?: string | null
          client?: string | null
          client_agent_folder?: string | null
          client_agent_url?: string | null
          client_call_recording_link?: string | null
          client_email?: string | null
          client_estimate_doc_url?: string | null
          client_id?: string | null
          client_phone?: string | null
          clientcompanyname?: string | null
          clientemail?: string | null
          clientfirstname?: string | null
          clientlastname?: string | null
          clientlinkedinbio?: string | null
          clientphone?: string | null
          clientwebsite?: string | null
          close_date?: string | null
          collaborative_ai?: string | null
          collaborative_ai_link?: string | null
          control_tower_client_id?: string | null
          control_tower_id?: string | null
          control_tower_metadata?: Json | null
          control_tower_owner_id?: string | null
          control_tower_status?: string | null
          created_at?: string
          created_date?: string | null
          days_in_stage?: number | null
          deal_details?: string | null
          deal_name?: string | null
          dealtype?: string | null
          deleted_at?: string | null
          estimate_task_link?: string | null
          estimate_url?: string | null
          expected_close_date?: string | null
          expected_closing_date?: string | null
          external_links?: Json | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          hubspot_crm_deal_url?: string | null
          hubspot_deal_id?: string | null
          hubspot_owner_id?: number | null
          id?: string
          internal_estimate_doc_link?: string | null
          internal_estimate_doc_url?: string | null
          last_activity_by?: string | null
          last_activity_date?: string | null
          last_synced_at?: string | null
          lead_source?: string | null
          leadslift_crm_deal_url?: string | null
          linkedin_profile_url?: string | null
          lovable_url?: string | null
          notes?: string | null
          owner?: string | null
          owner_id?: string | null
          pandadoc_proposal_url?: string | null
          pipeline?: string | null
          pm_assigned_id?: string | null
          pm_control_tower_id?: string | null
          pod_assigned?: string | null
          pod_id?: string | null
          potential_amount?: number | null
          priority?: string | null
          probability?: number | null
          slug?: string | null
          stage?: string | null
          status?: string | null
          synced_from_control_tower?: boolean | null
          tags?: string[] | null
          title?: string
          type_of_work?: string | null
          updated_at?: string
          value?: number | null
          workboard_ai_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      dhs_submissions: {
        Row: {
          content: string | null
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          control_tower_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          phone: string | null
          role: string | null
          synced_from_control_tower: boolean | null
          updated_at: string | null
        }
        Insert: {
          control_tower_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string | null
          synced_from_control_tower?: boolean | null
          updated_at?: string | null
        }
        Update: {
          control_tower_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string | null
          synced_from_control_tower?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      eod_submissions: {
        Row: {
          challenges: string | null
          created_at: string
          date: string
          hours_worked: number | null
          id: string
          project_id: string | null
          tasks_completed: string | null
          tomorrow_plan: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          date: string
          hours_worked?: number | null
          id?: string
          project_id?: string | null
          tasks_completed?: string | null
          tomorrow_plan?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges?: string | null
          created_at?: string
          date?: string
          hours_worked?: number | null
          id?: string
          project_id?: string | null
          tasks_completed?: string | null
          tomorrow_plan?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eod_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          feedback_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          feedback_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          feedback_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_attachments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_comments: {
        Row: {
          comment: string
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          attachment_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          feedback_number: number
          id: string
          module: string | null
          priority: string | null
          reviewed_by: string | null
          status: string
          subject: string
          type: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          feedback_number?: number
          id?: string
          module?: string | null
          priority?: string | null
          reviewed_by?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          feedback_number?: number
          id?: string
          module?: string | null
          priority?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: []
      }
      feedback_upvotes: {
        Row: {
          created_at: string
          feedback_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_upvotes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_suggestions: {
        Row: {
          accepted_at: string | null
          ai_message_draft: string | null
          campaign_contact_id: string | null
          created_at: string
          created_followup_id: string | null
          deal_id: string | null
          id: string
          reasoning: string
          rejected_at: string | null
          suggested_date: string
          suggested_priority: string
          suggested_type: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          ai_message_draft?: string | null
          campaign_contact_id?: string | null
          created_at?: string
          created_followup_id?: string | null
          deal_id?: string | null
          id?: string
          reasoning: string
          rejected_at?: string | null
          suggested_date: string
          suggested_priority: string
          suggested_type: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          ai_message_draft?: string | null
          campaign_contact_id?: string | null
          created_at?: string
          created_followup_id?: string | null
          deal_id?: string | null
          id?: string
          reasoning?: string
          rejected_at?: string | null
          suggested_date?: string
          suggested_priority?: string
          suggested_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_suggestions_campaign_contact_id_fkey"
            columns: ["campaign_contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_suggestions_created_followup_id_fkey"
            columns: ["created_followup_id"]
            isOneToOne: false
            referencedRelation: "followups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          ai_generated_message: string | null
          auto_generated: boolean
          campaign_contact_id: string | null
          completed_at: string | null
          contact: string
          created_at: string
          date: string
          deal_id: string | null
          followup_type: string
          id: string
          metadata: Json | null
          next_step: string | null
          outcome: string | null
          priority: string
          reminder_sent: boolean
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated_message?: string | null
          auto_generated?: boolean
          campaign_contact_id?: string | null
          completed_at?: string | null
          contact: string
          created_at?: string
          date: string
          deal_id?: string | null
          followup_type?: string
          id?: string
          metadata?: Json | null
          next_step?: string | null
          outcome?: string | null
          priority?: string
          reminder_sent?: boolean
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated_message?: string | null
          auto_generated?: boolean
          campaign_contact_id?: string | null
          completed_at?: string | null
          contact?: string
          created_at?: string
          date?: string
          deal_id?: string | null
          followup_type?: string
          id?: string
          metadata?: Json | null
          next_step?: string | null
          outcome?: string | null
          priority?: string
          reminder_sent?: boolean
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_campaign_contact_id_fkey"
            columns: ["campaign_contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      gohighlevel_contacts: {
        Row: {
          contact_id: string
          created_at: string
          email: string | null
          id: string
          integration_id: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          email?: string | null
          id?: string
          integration_id: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          email?: string | null
          id?: string
          integration_id?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gohighlevel_contacts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "gohighlevel_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      gohighlevel_integrations: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean | null
          location_id: string | null
          location_name: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          location_name?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          location_name?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_drive_sync_log: {
        Row: {
          completed_at: string | null
          created_at: string
          deal_id: string | null
          errors: Json | null
          files_added: number | null
          files_scanned: number | null
          files_skipped: number | null
          files_updated: number | null
          id: string
          started_at: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          errors?: Json | null
          files_added?: number | null
          files_scanned?: number | null
          files_skipped?: number | null
          files_updated?: number | null
          id?: string
          started_at?: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          errors?: Json | null
          files_added?: number | null
          files_scanned?: number | null
          files_skipped?: number | null
          files_updated?: number | null
          id?: string
          started_at?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_sync_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_sync_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_owners: {
        Row: {
          created_at: string
          hubspot_owner_id: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          owner_email: string | null
          owner_first_name: string | null
          owner_full_name: string | null
          owner_last_name: string | null
          teams: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hubspot_owner_id: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          owner_email?: string | null
          owner_first_name?: string | null
          owner_full_name?: string | null
          owner_last_name?: string | null
          teams?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hubspot_owner_id?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          owner_email?: string | null
          owner_first_name?: string | null
          owner_full_name?: string | null
          owner_last_name?: string | null
          teams?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      hubspot_sync_status: {
        Row: {
          companies_synced: number | null
          completed_at: string | null
          contacts_synced: number | null
          created_at: string
          deals_synced: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
          total_items_synced: number | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          companies_synced?: number | null
          completed_at?: string | null
          contacts_synced?: number | null
          created_at?: string
          deals_synced?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
          total_items_synced?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          companies_synced?: number | null
          completed_at?: string | null
          contacts_synced?: number | null
          created_at?: string
          deals_synced?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
          total_items_synced?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpis: {
        Row: {
          brand_id: string | null
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          project_id: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_import_jobs: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          criteria: Json
          duplicate_count: number | null
          error_details: string | null
          failed_count: number | null
          field_mapping: Json | null
          id: string
          import_source: string | null
          imported_count: number
          initiated_by: string | null
          is_rolled_back: boolean | null
          job_type: string | null
          notification_sent_at: string | null
          notify_email: string | null
          rollback_data: Json | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          sheet_url: string | null
          skipped_count: number | null
          started_at: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
          validation_results: Json | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          criteria?: Json
          duplicate_count?: number | null
          error_details?: string | null
          failed_count?: number | null
          field_mapping?: Json | null
          id?: string
          import_source?: string | null
          imported_count?: number
          initiated_by?: string | null
          is_rolled_back?: boolean | null
          job_type?: string | null
          notification_sent_at?: string | null
          notify_email?: string | null
          rollback_data?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          sheet_url?: string | null
          skipped_count?: number | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          validation_results?: Json | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          criteria?: Json
          duplicate_count?: number | null
          error_details?: string | null
          failed_count?: number | null
          field_mapping?: Json | null
          id?: string
          import_source?: string | null
          imported_count?: number
          initiated_by?: string | null
          is_rolled_back?: boolean | null
          job_type?: string | null
          notification_sent_at?: string | null
          notify_email?: string | null
          rollback_data?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          sheet_url?: string | null
          skipped_count?: number | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_import_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          enrichment_status: string | null
          exa_item_id: string | null
          id: string
          imported_via_exa: boolean | null
          industry: string | null
          last_enriched_at: string | null
          lead_score_exa: number | null
          metadata: Json | null
          phone: string | null
          slug: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrichment_status?: string | null
          exa_item_id?: string | null
          id?: string
          imported_via_exa?: boolean | null
          industry?: string | null
          last_enriched_at?: string | null
          lead_score_exa?: number | null
          metadata?: Json | null
          phone?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrichment_status?: string | null
          exa_item_id?: string | null
          id?: string
          imported_via_exa?: boolean | null
          industry?: string | null
          last_enriched_at?: string | null
          lead_score_exa?: number | null
          metadata?: Json | null
          phone?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string | null
          id: string
          link_url: string | null
          message: string | null
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          link_url?: string | null
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          link_url?: string | null
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pandadoc_integrations: {
        Row: {
          api_key_encrypted: string
          auto_send_enabled: boolean | null
          config: Json | null
          created_at: string
          default_template_id: string | null
          embed_enabled: boolean | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          api_key_encrypted: string
          auto_send_enabled?: boolean | null
          config?: Json | null
          created_at?: string
          default_template_id?: string | null
          embed_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          api_key_encrypted?: string
          auto_send_enabled?: boolean | null
          config?: Json | null
          created_at?: string
          default_template_id?: string | null
          embed_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      pod_members: {
        Row: {
          created_at: string
          id: string
          pod_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pod_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pod_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_members_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          lead_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          google_drive_link: string | null
          id: string
          is_active: boolean | null
          marketing_variant_link: string | null
          name: string
          owner_team: string | null
          pricing_model: string | null
          target_industries: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          google_drive_link?: string | null
          id?: string
          is_active?: boolean | null
          marketing_variant_link?: string | null
          name: string
          owner_team?: string | null
          pricing_model?: string | null
          target_industries?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          google_drive_link?: string | null
          id?: string
          is_active?: boolean | null
          marketing_variant_link?: string | null
          name?: string
          owner_team?: string | null
          pricing_model?: string | null
          target_industries?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_team_fkey"
            columns: ["owner_team"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          last_seen: string | null
          login_count: number | null
          notification_preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_login?: string | null
          last_seen?: string | null
          login_count?: number | null
          notification_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          last_seen?: string | null
          login_count?: number | null
          notification_preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      project_task_labels: {
        Row: {
          created_at: string | null
          label_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          label_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_task_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_task_labels_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          active_collab_link: string | null
          actual_hours: number | null
          assigned_to: string | null
          campaign_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          google_folder: Json | null
          id: string
          is_campaign_associated: boolean | null
          priority: string | null
          project_id: string | null
          reference_url: string | null
          status: string | null
          title: string
          updated_at: string
          workboard_ai_link: string | null
        }
        Insert: {
          active_collab_link?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          campaign_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          google_folder?: Json | null
          id?: string
          is_campaign_associated?: boolean | null
          priority?: string | null
          project_id?: string | null
          reference_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
          workboard_ai_link?: string | null
        }
        Update: {
          active_collab_link?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          campaign_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          google_folder?: Json | null
          id?: string
          is_campaign_associated?: boolean | null
          priority?: string | null
          project_id?: string | null
          reference_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          workboard_ai_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_id: string | null
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_manager_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
        Row: {
          brand_id: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          editor_url: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          pandadoc_doc_id: string | null
          pandadoc_session_id: string | null
          pdf_url: string | null
          recipient_url: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          brand_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          editor_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pandadoc_doc_id?: string | null
          pandadoc_session_id?: string | null
          pdf_url?: string | null
          recipient_url?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          brand_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          editor_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pandadoc_doc_id?: string | null
          pandadoc_session_id?: string | null
          pdf_url?: string | null
          recipient_url?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_batch_queue: {
        Row: {
          batch_number: number
          completed_at: string | null
          contacts_in_batch: string[] | null
          created_at: string | null
          emails_failed: number | null
          emails_sent: number | null
          enrollment_id: string
          error_message: string | null
          id: string
          scheduled_for: string
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number: number
          completed_at?: string | null
          contacts_in_batch?: string[] | null
          created_at?: string | null
          emails_failed?: number | null
          emails_sent?: number | null
          enrollment_id: string
          error_message?: string | null
          id?: string
          scheduled_for: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: number
          completed_at?: string | null
          contacts_in_batch?: string[] | null
          created_at?: string | null
          emails_failed?: number | null
          emails_sent?: number | null
          enrollment_id?: string
          error_message?: string | null
          id?: string
          scheduled_for?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_batch_queue_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "contact_sequence_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_execution_log: {
        Row: {
          channel_used: string | null
          enrollment_id: string
          error_message: string | null
          executed_at: string
          execution_metadata: Json | null
          id: string
          message_sent: string | null
          response_data: Json | null
          response_received: boolean | null
          status: string
          step_id: string
        }
        Insert: {
          channel_used?: string | null
          enrollment_id: string
          error_message?: string | null
          executed_at?: string
          execution_metadata?: Json | null
          id?: string
          message_sent?: string | null
          response_data?: Json | null
          response_received?: boolean | null
          status: string
          step_id: string
        }
        Update: {
          channel_used?: string | null
          enrollment_id?: string
          error_message?: string | null
          executed_at?: string
          execution_metadata?: Json | null
          id?: string
          message_sent?: string | null
          response_data?: Json | null
          response_received?: boolean | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_execution_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "contact_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_execution_log_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_rate_limits: {
        Row: {
          channel: string
          cooldown_minutes: number
          created_at: string
          id: string
          max_per_day: number
          max_per_hour: number
          max_per_minute: number
          updated_at: string
        }
        Insert: {
          channel: string
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_per_day?: number
          max_per_hour?: number
          max_per_minute?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_per_day?: number
          max_per_hour?: number
          max_per_minute?: number
          updated_at?: string
        }
        Relationships: []
      }
      sequence_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          priority: number
          rule_config: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          rule_config?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          rule_config?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          ai_personalization_enabled: boolean | null
          channel: string
          conditions: Json | null
          content_template: Json
          created_at: string
          delay_unit: string
          delay_value: number
          fallback_step_id: string | null
          id: string
          sequence_id: string
          step_order: number
          updated_at: string
        }
        Insert: {
          ai_personalization_enabled?: boolean | null
          channel: string
          conditions?: Json | null
          content_template?: Json
          created_at?: string
          delay_unit?: string
          delay_value?: number
          fallback_step_id?: string | null
          id?: string
          sequence_id: string
          step_order: number
          updated_at?: string
        }
        Update: {
          ai_personalization_enabled?: boolean | null
          channel?: string
          conditions?: Json | null
          content_template?: Json
          created_at?: string
          delay_unit?: string
          delay_value?: number
          fallback_step_id?: string | null
          id?: string
          sequence_id?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_fallback_step_id_fkey"
            columns: ["fallback_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "campaign_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_document_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          description: string | null
          document_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          description?: string | null
          document_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          description?: string | null
          document_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_document_activity_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "signing_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_document_recipients: {
        Row: {
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          document_id: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          signed_at: string | null
          signing_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          document_id: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          signed_at?: string | null
          signing_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          document_id?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          signed_at?: string | null
          signing_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_document_recipients_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "signing_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_document_watchers: {
        Row: {
          created_at: string
          document_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_document_watchers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "signing_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_documents: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          declined_at: string | null
          document_type: string
          expired_at: string | null
          expires_at: string | null
          file_url: string | null
          id: string
          merge_fields: Json | null
          metadata: Json | null
          pandadoc_doc_id: string | null
          project_id: string | null
          sent_at: string | null
          signed_file_url: string | null
          signer_email: string | null
          signer_name: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          declined_at?: string | null
          document_type?: string
          expired_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          merge_fields?: Json | null
          metadata?: Json | null
          pandadoc_doc_id?: string | null
          project_id?: string | null
          sent_at?: string | null
          signed_file_url?: string | null
          signer_email?: string | null
          signer_name?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          declined_at?: string | null
          document_type?: string
          expired_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          merge_fields?: Json | null
          metadata?: Json | null
          pandadoc_doc_id?: string | null
          project_id?: string | null
          sent_at?: string | null
          signed_file_url?: string | null
          signer_email?: string | null
          signer_name?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sql_query_logs: {
        Row: {
          created_at: string
          error_message: string | null
          execution_status: string
          execution_time_ms: number | null
          id: string
          query_text: string
          query_type: string
          result_preview: Json | null
          rows_affected: number | null
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_status: string
          execution_time_ms?: number | null
          id?: string
          query_text: string
          query_type: string
          result_preview?: Json | null
          rows_affected?: number | null
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_status?: string
          execution_time_ms?: number | null
          id?: string
          query_text?: string
          query_type?: string
          result_preview?: Json | null
          rows_affected?: number | null
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      target_niches: {
        Row: {
          business_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dreams: string[] | null
          employee_size_max: number | null
          employee_size_min: number | null
          id: string
          industries: string[] | null
          name: string
          pain_points: string[] | null
          pod_id: string | null
          priority: string
          revenue_max: number | null
          revenue_min: number | null
          services: string[] | null
          status: string
          target_clients: number | null
          target_contacts: string[] | null
          target_regions: string[] | null
          target_revenue: number | null
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dreams?: string[] | null
          employee_size_max?: number | null
          employee_size_min?: number | null
          id?: string
          industries?: string[] | null
          name: string
          pain_points?: string[] | null
          pod_id?: string | null
          priority?: string
          revenue_max?: number | null
          revenue_min?: number | null
          services?: string[] | null
          status?: string
          target_clients?: number | null
          target_contacts?: string[] | null
          target_regions?: string[] | null
          target_revenue?: number | null
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dreams?: string[] | null
          employee_size_max?: number | null
          employee_size_min?: number | null
          id?: string
          industries?: string[] | null
          name?: string
          pain_points?: string[] | null
          pod_id?: string | null
          priority?: string
          revenue_max?: number | null
          revenue_min?: number | null
          services?: string[] | null
          status?: string
          target_clients?: number | null
          target_contacts?: string[] | null
          target_regions?: string[] | null
          target_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_niches_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body_text: string
          created_at: string | null
          edited: boolean | null
          id: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body_text: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body_text?: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_summaries: {
        Row: {
          created_at: string
          date: string
          id: string
          summary: string | null
          team_size: number | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          summary?: string | null
          team_size?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          summary?: string | null
          team_size?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_accountability_chart: {
        Row: {
          created_at: string
          id: string
          responsibilities: string | null
          serial_number: number
          type_of_work: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responsibilities?: string | null
          serial_number?: number
          type_of_work: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responsibilities?: string | null
          serial_number?: number
          type_of_work?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_agent_personalizations: {
        Row: {
          additional_prompt: string | null
          agent_id: string
          created_at: string
          id: string
          is_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_prompt?: string | null
          agent_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_prompt?: string | null
          agent_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_personalizations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brands: {
        Row: {
          access_level: string
          brand_id: string
          can_edit_kpis: boolean
          can_edit_settings: boolean
          can_manage_team: boolean
          can_view_kpis: boolean
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          brand_id: string
          can_edit_kpis?: boolean
          can_edit_settings?: boolean
          can_manage_team?: boolean
          can_view_kpis?: boolean
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_level?: string
          brand_id?: string
          can_edit_kpis?: boolean
          can_edit_settings?: boolean
          can_manage_team?: boolean
          can_view_kpis?: boolean
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          data: Json | null
          id: string
          link_url: string | null
          message: string
          read: boolean
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link_url?: string | null
          message: string
          read?: boolean
          read_at?: string | null
          task_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link_url?: string | null
          message?: string
          read?: boolean
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_performance_metrics: {
        Row: {
          ai_agents_run: number | null
          campaigns_owned: number | null
          contacts_reached: number | null
          created_at: string | null
          deals_closed: number | null
          deals_created: number | null
          deals_lost: number | null
          deals_won: number | null
          efficiency_rating: number | null
          eod_submissions: number | null
          id: string
          meetings_booked: number | null
          metric_period: string
          performance_score: number | null
          period_end: string
          period_start: string
          responses_received: number | null
          tasks_completed: number | null
          total_deal_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_agents_run?: number | null
          campaigns_owned?: number | null
          contacts_reached?: number | null
          created_at?: string | null
          deals_closed?: number | null
          deals_created?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          efficiency_rating?: number | null
          eod_submissions?: number | null
          id?: string
          meetings_booked?: number | null
          metric_period: string
          performance_score?: number | null
          period_end: string
          period_start: string
          responses_received?: number | null
          tasks_completed?: number | null
          total_deal_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_agents_run?: number | null
          campaigns_owned?: number | null
          contacts_reached?: number | null
          created_at?: string | null
          deals_closed?: number | null
          deals_created?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          efficiency_rating?: number | null
          eod_submissions?: number | null
          id?: string
          meetings_booked?: number | null
          metric_period?: string
          performance_score?: number | null
          period_end?: string
          period_start?: string
          responses_received?: number | null
          tasks_completed?: number | null
          total_deal_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          created_by: string | null
          duration: number | null
          id: string
          prompt: string
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration?: number | null
          id?: string
          prompt: string
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration?: number | null
          id?: string
          prompt?: string
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      zerobounce_config: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          credits_remaining: number | null
          id: string
          is_active: boolean
          last_tested_at: string | null
          test_response: Json | null
          test_status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          credits_remaining?: number | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          test_response?: Json | null
          test_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          credits_remaining?: number | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          test_response?: Json | null
          test_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      zerobounce_validations: {
        Row: {
          account: string | null
          campaign_contact_id: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          did_you_mean: string | null
          domain: string | null
          domain_age_days: string | null
          email: string
          firstname: string | null
          free_email: boolean | null
          gender: string | null
          id: string
          lastname: string | null
          mx_found: string | null
          mx_record: string | null
          processed_at: string | null
          region: string | null
          smtp_provider: string | null
          sub_status: string | null
          validation_metadata: Json | null
          validation_status: string
          zipcode: string | null
        }
        Insert: {
          account?: string | null
          campaign_contact_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          did_you_mean?: string | null
          domain?: string | null
          domain_age_days?: string | null
          email: string
          firstname?: string | null
          free_email?: boolean | null
          gender?: string | null
          id?: string
          lastname?: string | null
          mx_found?: string | null
          mx_record?: string | null
          processed_at?: string | null
          region?: string | null
          smtp_provider?: string | null
          sub_status?: string | null
          validation_metadata?: Json | null
          validation_status: string
          zipcode?: string | null
        }
        Update: {
          account?: string | null
          campaign_contact_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          did_you_mean?: string | null
          domain?: string | null
          domain_age_days?: string | null
          email?: string
          firstname?: string | null
          free_email?: boolean | null
          gender?: string | null
          id?: string
          lastname?: string | null
          mx_found?: string | null
          mx_record?: string | null
          processed_at?: string | null
          region?: string | null
          smtp_provider?: string | null
          sub_status?: string | null
          validation_metadata?: Json | null
          validation_status?: string
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zerobounce_validations_campaign_contact_id_fkey"
            columns: ["campaign_contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      linkedin_message_analytics: {
        Row: {
          campaign_id: string | null
          message_type: string | null
          negative_responses: number | null
          neutral_responses: number | null
          positive_responses: number | null
          response_rate_percent: number | null
          total_generated: number | null
          total_responses: number | null
          total_sent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contact_linkedin_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bd_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_resolve_alerts: { Args: never; Returns: undefined }
      calculate_health_score: {
        Args: {
          p_api_response_time_ms: number
          p_failed_count_24h: number
          p_hours_since_last_sync: number
          p_sync_success_rate_24h: number
          p_total_deals: number
          p_total_syncs_24h: number
          p_unmapped_total: number
        }
        Returns: Json
      }
      calculate_user_performance_metrics: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: Json
      }
      check_brand_permission: {
        Args: { p_brand_id: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_sync_logs: { Args: never; Returns: undefined }
      clear_all_sync_logs: { Args: never; Returns: undefined }
      consolidate_short_term_memories: {
        Args: { p_agent_id: string; p_days_old?: number; p_user_id: string }
        Returns: number
      }
      execute_raw_sql: { Args: { query_text: string }; Returns: Json }
      fix_orphaned_users: {
        Args: never
        Returns: {
          error_message: string
          fixed_user_id: string
          profile_created: boolean
          role_created: boolean
          user_email: string
        }[]
      }
      generate_alert: {
        Args: {
          p_alert_type: string
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      generate_deal_slug: {
        Args: { deal_id: string; deal_title: string }
        Returns: string
      }
      generate_slug_numeric: { Args: { base_text: string }; Returns: string }
      get_current_quarter: { Args: never; Returns: string }
      get_deal_stage_counts: {
        Args: never
        Returns: {
          count: number
          stage: string
        }[]
      }
      get_employee_by_ct_id: {
        Args: { ct_id: string }
        Returns: {
          email: string
          full_name: string
          phone: string
        }[]
      }
      get_relevant_memories: {
        Args: {
          p_agent_id: string
          p_embedding: string
          p_limit?: number
          p_similarity_threshold?: number
          p_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          importance_score: number
          memory_category: string
          similarity: number
        }[]
      }
      get_sync_health_summary: { Args: never; Returns: Json }
      get_unmapped_deal_owners: {
        Args: never
        Returns: {
          control_tower_owner_id: string
          deal_id: string
          deal_title: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_brands: {
        Args: { p_user_id: string }
        Returns: {
          access_level: string
          brand_id: string
          brand_name: string
          brand_slug: string
          brand_type: string
          is_active: boolean
          logo_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_memory_access: {
        Args: { memory_ids: string[] }
        Returns: undefined
      }
      is_manager_or_admin: { Args: never; Returns: boolean }
      mark_all_notifications_as_read: { Args: never; Returns: undefined }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      prune_short_term_memories: {
        Args: {
          p_agent_id: string
          p_days_old?: number
          p_importance_threshold?: number
          p_user_id: string
        }
        Returns: number
      }
      update_campaign_financials: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      update_overdue_followups: { Args: never; Returns: undefined }
    }
    Enums: {
      activity_frequency:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "one_time"
      activity_status: "active" | "paused" | "completed"
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "project_manager"
        | "team_member"
        | "client"
        | "bd_user"
      goal_approval_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
      goal_status: "on_track" | "at_risk" | "off_track" | "completed"
      quarter_status: "planning" | "active" | "completed" | "archived"
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
      activity_frequency: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "one_time",
      ],
      activity_status: ["active", "paused", "completed"],
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "project_manager",
        "team_member",
        "client",
        "bd_user",
      ],
      goal_approval_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
      ],
      goal_status: ["on_track", "at_risk", "off_track", "completed"],
      quarter_status: ["planning", "active", "completed", "archived"],
    },
  },
} as const
