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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          created_at: string
          custom_name: string | null
          date: string
          id: string
          part: string
          user_id: string
          value_cm: number
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          date: string
          id?: string
          part: string
          user_id?: string
          value_cm: number
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          date?: string
          id?: string
          part?: string
          user_id?: string
          value_cm?: number
        }
        Relationships: []
      }
      body_weights: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      daily_steps: {
        Row: {
          date: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          steps: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          date?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          equipment: string
          id: string
          is_unilateral: boolean
          name: string | null
          name_i18n: Json | null
          owner_id: string | null
          primary_muscles: string[]
          secondary_muscles: string[]
          slug: string | null
          tracking_type: string
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          equipment: string
          id?: string
          is_unilateral?: boolean
          name?: string | null
          name_i18n?: Json | null
          owner_id?: string | null
          primary_muscles?: string[]
          secondary_muscles?: string[]
          slug?: string | null
          tracking_type: string
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          equipment?: string
          id?: string
          is_unilateral?: boolean
          name?: string | null
          name_i18n?: Json | null
          owner_id?: string | null
          primary_muscles?: string[]
          secondary_muscles?: string[]
          slug?: string | null
          tracking_type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          created_at: string
          daily_step_goal: number
          display_name: string | null
          focus: string | null
          hide_progress_photos: boolean
          id: string
          language: string
          username: string
          weekly_goal: number | null
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          daily_step_goal?: number
          display_name?: string | null
          focus?: string | null
          hide_progress_photos?: boolean
          id: string
          language?: string
          username: string
          weekly_goal?: number | null
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          daily_step_goal?: number
          display_name?: string | null
          focus?: string | null
          hide_progress_photos?: boolean
          id?: string
          language?: string
          username?: string
          weekly_goal?: number | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          storage_path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          group_key: string | null
          id: string
          notes: string | null
          position: number
          rest_s: number | null
          routine_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          group_key?: string | null
          id?: string
          notes?: string | null
          position: number
          rest_s?: number | null
          routine_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          group_key?: string | null
          id?: string
          notes?: string | null
          position?: number
          rest_s?: number | null
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_sets: {
        Row: {
          created_at: string
          id: string
          position: number
          routine_exercise_id: string
          target_distance_m: number | null
          target_duration_s: number | null
          target_incline_pct: number | null
          target_level: number | null
          target_reps: number | null
          target_speed_kmh: number | null
          target_weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          routine_exercise_id: string
          target_distance_m?: number | null
          target_duration_s?: number | null
          target_incline_pct?: number | null
          target_level?: number | null
          target_reps?: number | null
          target_speed_kmh?: number | null
          target_weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          routine_exercise_id?: string
          target_distance_m?: number | null
          target_duration_s?: number | null
          target_incline_pct?: number | null
          target_level?: number | null
          target_reps?: number | null
          target_speed_kmh?: number | null
          target_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_sets_routine_exercise_id_fkey"
            columns: ["routine_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          archived_at: string | null
          created_at: string
          custom_label: string | null
          description: string | null
          id: string
          label: string
          name: string
          notes: string | null
          planned_duration_s: number | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          custom_label?: string | null
          description?: string | null
          id?: string
          label?: string
          name: string
          notes?: string | null
          planned_duration_s?: number | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          custom_label?: string | null
          description?: string | null
          id?: string
          label?: string
          name?: string
          notes?: string | null
          planned_duration_s?: number | null
          user_id?: string
        }
        Relationships: []
      }
      schedule_overrides: {
        Row: {
          created_at: string
          id: string
          moved_to: string | null
          planned_date: string
          position: number
          routine_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moved_to?: string | null
          planned_date: string
          position?: number
          routine_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          moved_to?: string | null
          planned_date?: string
          position?: number
          routine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_overrides_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          change: string | null
          change_reason: string | null
          created_at: string
          exercise_id: string
          group_key: string | null
          id: string
          notes: string | null
          position: number
          rest_s: number | null
          routine_exercise_id: string | null
          session_id: string
          swapped_from_id: string | null
        }
        Insert: {
          change?: string | null
          change_reason?: string | null
          created_at?: string
          exercise_id: string
          group_key?: string | null
          id: string
          notes?: string | null
          position: number
          rest_s?: number | null
          routine_exercise_id?: string | null
          session_id: string
          swapped_from_id?: string | null
        }
        Update: {
          change?: string | null
          change_reason?: string | null
          created_at?: string
          exercise_id?: string
          group_key?: string | null
          id?: string
          notes?: string | null
          position?: number
          rest_s?: number | null
          routine_exercise_id?: string | null
          session_id?: string
          swapped_from_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_routine_exercise_id_fkey"
            columns: ["routine_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_swapped_from_id_fkey"
            columns: ["swapped_from_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          completed_at: string
          distance_m: number | null
          duration_s: number | null
          id: string
          incline_pct: number | null
          level: number | null
          position: number
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_type: string
          speed_kmh: number | null
          weight_kg: number | null
        }
        Insert: {
          completed_at: string
          distance_m?: number | null
          duration_s?: number | null
          id: string
          incline_pct?: number | null
          level?: number | null
          position: number
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_type?: string
          speed_kmh?: number | null
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          incline_pct?: number | null
          level?: number | null
          position?: number
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_type?: string
          speed_kmh?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercise_settings: {
        Row: {
          created_at: string
          default_rest_s: number | null
          exercise_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          default_rest_s?: number | null
          exercise_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          default_rest_s?: number | null
          exercise_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_settings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule: {
        Row: {
          created_at: string
          position: number
          routine_id: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          position?: number
          routine_id: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          position?: number
          routine_id?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_sports: {
        Row: {
          created_at: string
          custom_name: string | null
          duration_s: number | null
          id: string
          position: number
          sport: string
          start_time: string | null
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          duration_s?: number | null
          id?: string
          position?: number
          sport: string
          start_time?: string | null
          user_id?: string
          weekday: number
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          duration_s?: number | null
          id?: string
          position?: number
          sport?: string
          start_time?: string | null
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          change_reason: string | null
          created_at: string
          date: string
          duration_s: number | null
          ended_at: string | null
          energy: number | null
          external_id: string | null
          id: string
          log_mode: string
          notes: string | null
          planned_routine_id: string | null
          planned_sport_id: string | null
          routine_id: string | null
          source: string
          sport: string | null
          sport_name: string | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          date: string
          duration_s?: number | null
          ended_at?: string | null
          energy?: number | null
          external_id?: string | null
          id: string
          log_mode?: string
          notes?: string | null
          planned_routine_id?: string | null
          planned_sport_id?: string | null
          routine_id?: string | null
          source?: string
          sport?: string | null
          sport_name?: string | null
          started_at?: string | null
          status: string
          user_id?: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          date?: string
          duration_s?: number | null
          ended_at?: string | null
          energy?: number | null
          external_id?: string | null
          id?: string
          log_mode?: string
          notes?: string | null
          planned_routine_id?: string | null
          planned_sport_id?: string | null
          routine_id?: string | null
          source?: string
          sport?: string | null
          sport_name?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_planned_routine_id_fkey"
            columns: ["planned_routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_planned_sport_id_fkey"
            columns: ["planned_sport_id"]
            isOneToOne: false
            referencedRelation: "weekly_sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finish_workout: { Args: { p_session: Json }; Returns: string }
      is_username_available: { Args: { candidate: string }; Returns: boolean }
      last_sets: {
        Args: {
          p_before_session_id?: string
          p_exercise_ids: string[]
          p_routine_id: string
        }
        Returns: {
          distance_m: number
          duration_s: number
          exercise_id: string
          incline_pct: number
          level: number
          position: number
          reps: number
          routine_exercise_id: string
          scope: string
          session_date: string
          set_type: string
          speed_kmh: number
          weight_kg: number
        }[]
      }
      reorder_day: {
        Args: { p_items: Json; p_weekday: number }
        Returns: undefined
      }
      replace_schedule_overrides: {
        Args: { p_from: string; p_moves: Json; p_to: string }
        Returns: undefined
      }
      save_daily_steps: { Args: { p_days: Json }; Returns: undefined }
      save_routine: {
        Args: {
          p_custom_label: string
          p_description?: string
          p_exercises: Json
          p_id: string
          p_label: string
          p_name: string
          p_notes: string
          p_planned_duration_s: number
          p_weekdays: number[]
        }
        Returns: string
      }
      workout_summaries: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          date: string
          distance_m: number
          duration_s: number
          exercises: number
          id: string
          log_mode: string
          pace_distance_m: number
          pace_duration_s: number
          routine_custom_label: string
          routine_id: string
          routine_label: string
          routine_name: string
          run_distance_m: number
          sets: number
          sport: string
          sport_name: string
          volume_kg: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
