export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          flagged: boolean
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          occurrence_id: string | null
          status: string
          stripe_authorization_id: string | null
          type: string
          user_id: string | null
          whip_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          occurrence_id?: string | null
          status: string
          stripe_authorization_id?: string | null
          type: string
          user_id?: string | null
          whip_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          occurrence_id?: string | null
          status?: string
          stripe_authorization_id?: string | null
          type?: string
          user_id?: string | null
          whip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "wip_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          stripe_cardholder_id: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          stripe_cardholder_id?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          stripe_cardholder_id?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      whips: {
        Row: {
          approval_threshold: number | null
          contribution_amount: number | null
          created_at: string
          creator_id: string | null
          current_balance: number
          deadline: string | null
          id: string
          purpose: string
          status: string
          stripe_card_id: string | null
          target_balance: number
          title: string
          type: string
        }
        Insert: {
          approval_threshold?: number | null
          contribution_amount?: number | null
          created_at?: string
          creator_id?: string | null
          current_balance?: number
          deadline?: string | null
          id?: string
          purpose: string
          status?: string
          stripe_card_id?: string | null
          target_balance: number
          title: string
          type?: string
        }
        Update: {
          approval_threshold?: number | null
          contribution_amount?: number | null
          created_at?: string
          creator_id?: string | null
          current_balance?: number
          deadline?: string | null
          id?: string
          purpose?: string
          status?: string
          stripe_card_id?: string | null
          target_balance?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          phone: string
          status: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          phone: string
          status?: string
          whip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          phone?: string
          status?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_invites_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          whip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_members_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_nudges: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          target_user_id: string | null
          whip_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          target_user_id?: string | null
          whip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          target_user_id?: string | null
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_nudges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_nudges_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_nudges_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_occurrences: {
        Row: {
          created_at: string
          id: string
          occurs_on: string
          status: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurs_on: string
          status?: string
          whip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occurs_on?: string
          status?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_occurrences_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_rsvps: {
        Row: {
          id: string
          occurrence_id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          occurrence_id: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          occurrence_id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_rsvps_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "wip_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_rules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          rule_text: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          rule_text: string
          whip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          rule_text?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_rules_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_approvals: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          requested_by: string | null
          status: string
          whip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          requested_by?: string | null
          status?: string
          whip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          requested_by?: string | null
          status?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_wip_invite: { Args: { p_invite_id: string }; Returns: boolean }
      list_my_pending_invites: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          phone: string
          whip_id: string
          whip_title: string
        }[]
      }
      approve_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      execute_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      flag_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: boolean
      }
      is_wip_member: { Args: { p_whip_id: string }; Returns: boolean }
      is_wip_staff: { Args: { p_whip_id: string }; Returns: boolean }
      pay_pending_contribution: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      process_whip_withdrawal: {
        Args: {
          p_amount: number
          p_description: string
          p_stripe_auth_id: string
          p_user_id: string
          p_whip_id: string
        }
        Returns: boolean
      }
      request_withdrawal: {
        Args: { p_amount: number; p_description: string; p_whip_id: string }
        Returns: string
      }
      set_rsvp: {
        Args: { p_occurrence_id: string; p_status: string }
        Returns: boolean
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
  public: {
    Enums: {},
  },
} as const
