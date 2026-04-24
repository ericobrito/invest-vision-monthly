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
      investments: {
        Row: {
          annual_return: number | null
          applied: number | null
          created_at: string
          id: string
          income_type: string
          name: string
          percentage: number
          region: string
          snapshot_id: string
          sort_order: number
          total_return: number | null
          value: number
          year_started: string | null
        }
        Insert: {
          annual_return?: number | null
          applied?: number | null
          created_at?: string
          id?: string
          income_type?: string
          name: string
          percentage?: number
          region?: string
          snapshot_id: string
          sort_order?: number
          total_return?: number | null
          value?: number
          year_started?: string | null
        }
        Update: {
          annual_return?: number | null
          applied?: number | null
          created_at?: string
          id?: string
          income_type?: string
          name?: string
          percentage?: number
          region?: string
          snapshot_id?: string
          sort_order?: number
          total_return?: number | null
          value?: number
          year_started?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "monthly_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_snapshots: {
        Row: {
          brazil: number | null
          change_percentage: number | null
          change_value: number | null
          created_at: string
          exterior: number | null
          fixed_income: number | null
          growth_2025: number | null
          id: string
          label: string
          month: string
          total: number
          updated_at: string
          variable_income: number | null
        }
        Insert: {
          brazil?: number | null
          change_percentage?: number | null
          change_value?: number | null
          created_at?: string
          exterior?: number | null
          fixed_income?: number | null
          growth_2025?: number | null
          id?: string
          label: string
          month: string
          total?: number
          updated_at?: string
          variable_income?: number | null
        }
        Update: {
          brazil?: number | null
          change_percentage?: number | null
          change_value?: number | null
          created_at?: string
          exterior?: number | null
          fixed_income?: number | null
          growth_2025?: number | null
          id?: string
          label?: string
          month?: string
          total?: number
          updated_at?: string
          variable_income?: number | null
        }
        Relationships: []
      }
      va_connections: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_error: string | null
          last_sync: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_sync?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_sync?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      va_credentials: {
        Row: {
          api_key: string
          api_secret: string
          connection_id: string
          created_at: string
          passphrase: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          api_secret: string
          connection_id: string
          created_at?: string
          passphrase?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          connection_id?: string
          created_at?: string
          passphrase?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "va_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "va_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      va_positions: {
        Row: {
          asset_type: string
          broker: string
          connection_id: string | null
          created_at: string
          current_value: number
          external_id: string | null
          id: string
          last_sync: string | null
          provider: string | null
          quantity: number
          source: string
          ticker: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          broker: string
          connection_id?: string | null
          created_at?: string
          current_value?: number
          external_id?: string | null
          id?: string
          last_sync?: string | null
          provider?: string | null
          quantity?: number
          source: string
          ticker: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          broker?: string
          connection_id?: string | null
          created_at?: string
          current_value?: number
          external_id?: string | null
          id?: string
          last_sync?: string | null
          provider?: string | null
          quantity?: number
          source?: string
          ticker?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "va_positions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "va_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
