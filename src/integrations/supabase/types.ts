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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      chat_files: {
        Row: {
          content_preview: string | null
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          session_id: string
        }
        Insert: {
          content_preview?: string | null
          created_at?: string
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          session_id: string
        }
        Update: {
          content_preview?: string | null
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          created_at: string
          date: string
          email: string | null
          id: string
          message_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          email?: string | null
          id?: string
          message_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          email?: string | null
          id?: string
          message_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ledger_batches: {
        Row: {
          created_at: string
          entry_count: number
          from_id: string | null
          id: string
          l2_block_number: number | null
          l2_tx: string | null
          root_hash: string
          to_id: string | null
        }
        Insert: {
          created_at?: string
          entry_count?: number
          from_id?: string | null
          id?: string
          l2_block_number?: number | null
          l2_tx?: string | null
          root_hash: string
          to_id?: string | null
        }
        Update: {
          created_at?: string
          entry_count?: number
          from_id?: string | null
          id?: string
          l2_block_number?: number | null
          l2_tx?: string | null
          root_hash?: string
          to_id?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          agent_id: string
          arweave_tx: string | null
          batch_id: string | null
          body_hash: string
          body_json: Json
          created_at: string
          entry_type: string
          id: string
          l2_tx: string | null
          prev_hash: string | null
        }
        Insert: {
          agent_id: string
          arweave_tx?: string | null
          batch_id?: string | null
          body_hash: string
          body_json: Json
          created_at?: string
          entry_type: string
          id?: string
          l2_tx?: string | null
          prev_hash?: string | null
        }
        Update: {
          agent_id?: string
          arweave_tx?: string | null
          batch_id?: string | null
          body_hash?: string
          body_json?: Json
          created_at?: string
          entry_type?: string
          id?: string
          l2_tx?: string | null
          prev_hash?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          ai_model: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          target_ai: string | null
        }
        Insert: {
          ai_model?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          target_ai?: string | null
        }
        Update: {
          ai_model?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          target_ai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ledger_verification: {
        Row: {
          agent_id: string | null
          batch_id: string | null
          batch_l2_tx: string | null
          batch_root_hash: string | null
          body_hash: string | null
          body_json: Json | null
          created_at: string | null
          entry_type: string | null
          id: string | null
          l2_block_number: number | null
          prev_hash: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_canonical_hash: {
        Args: { data: Json }
        Returns: string
      }
      create_ledger_batch: {
        Args: { p_entry_ids: string[] }
        Returns: string
      }
      get_daily_usage: {
        Args: { p_email?: string; p_user_id?: string }
        Returns: number
      }
      get_prev_hash: {
        Args: { p_agent_id: string }
        Returns: string
      }
      increment_daily_usage: {
        Args: { p_email?: string; p_user_id?: string }
        Returns: number
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
    Enums: {},
  },
} as const
