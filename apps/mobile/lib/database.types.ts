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
      beta_feedback: {
        Row: {
          biggest_issue: string | null
          created_at: string
          ease_of_use: string
          fee_tolerance: string
          id: string
          recommend_score: number
          would_switch: string
        }
        Insert: {
          biggest_issue?: string | null
          created_at?: string
          ease_of_use: string
          fee_tolerance: string
          id?: string
          recommend_score: number
          would_switch: string
        }
        Update: {
          biggest_issue?: string | null
          created_at?: string
          ease_of_use?: string
          fee_tolerance?: string
          id?: string
          recommend_score?: number
          would_switch?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          kind: string
          whip_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          whip_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          whip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
          plan_id: string | null
          status: string
          stripe_authorization_id: string | null
          stripe_payment_intent_id: string | null
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
          plan_id?: string | null
          status: string
          stripe_authorization_id?: string | null
          stripe_payment_intent_id?: string | null
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
          plan_id?: string | null
          status?: string
          stripe_authorization_id?: string | null
          stripe_payment_intent_id?: string | null
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
            foreignKeyName: "transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "wip_contribution_plans"
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
          avatar_url: string | null
          created_at: string
          email: string
          expo_push_token: string | null
          full_name: string
          id: string
          stripe_cardholder_id: string | null
          stripe_customer_id: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          expo_push_token?: string | null
          full_name: string
          id: string
          stripe_cardholder_id?: string | null
          stripe_customer_id?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          expo_push_token?: string | null
          full_name?: string
          id?: string
          stripe_cardholder_id?: string | null
          stripe_customer_id?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      whips: {
        Row: {
          active_from: string | null
          active_until: string | null
          approval_threshold: number | null
          card_active: boolean
          card_is_fake: boolean
          contribution_amount: number | null
          created_at: string
          creator_id: string | null
          current_balance: number
          deadline: string | null
          event_date: string | null
          event_end_date: string | null
          id: string
          is_demo: boolean
          purpose: string
          recurring_day: string | null
          recurring_time: string | null
          status: string
          stripe_card_exp_month: number | null
          stripe_card_exp_year: number | null
          stripe_card_id: string | null
          stripe_card_last4: string | null
          target_balance: number
          title: string
          type: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          approval_threshold?: number | null
          card_active?: boolean
          card_is_fake?: boolean
          contribution_amount?: number | null
          created_at?: string
          creator_id?: string | null
          current_balance?: number
          deadline?: string | null
          event_date?: string | null
          event_end_date?: string | null
          id?: string
          is_demo?: boolean
          purpose: string
          recurring_day?: string | null
          recurring_time?: string | null
          status?: string
          stripe_card_exp_month?: number | null
          stripe_card_exp_year?: number | null
          stripe_card_id?: string | null
          stripe_card_last4?: string | null
          target_balance: number
          title: string
          type?: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          approval_threshold?: number | null
          card_active?: boolean
          card_is_fake?: boolean
          contribution_amount?: number | null
          created_at?: string
          creator_id?: string | null
          current_balance?: number
          deadline?: string | null
          event_date?: string | null
          event_end_date?: string | null
          id?: string
          is_demo?: boolean
          purpose?: string
          recurring_day?: string | null
          recurring_time?: string | null
          status?: string
          stripe_card_exp_month?: number | null
          stripe_card_exp_year?: number | null
          stripe_card_id?: string | null
          stripe_card_last4?: string | null
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
      wip_contribution_plans: {
        Row: {
          amount: number
          created_at: string
          id: string
          installments_paid: number
          next_charge_date: string
          status: string
          stripe_payment_method_id: string
          stripe_payment_method_type: string
          total_installments: number
          user_id: string
          whip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installments_paid?: number
          next_charge_date: string
          status?: string
          stripe_payment_method_id: string
          stripe_payment_method_type: string
          total_installments: number
          user_id: string
          whip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installments_paid?: number
          next_charge_date?: string
          status?: string
          stripe_payment_method_id?: string
          stripe_payment_method_type?: string
          total_installments?: number
          user_id?: string
          whip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_contribution_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wip_contribution_plans_whip_id_fkey"
            columns: ["whip_id"]
            isOneToOne: false
            referencedRelation: "whips"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          name: string | null
          phone: string
          status: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          phone: string
          status?: string
          whip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
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
          rsvp_status: string
          user_id: string
          whip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          rsvp_status?: string
          user_id: string
          whip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          rsvp_status?: string
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
      add_wip_member_and_friend: {
        Args: { p_role?: string; p_user_id: string; p_whip_id: string }
        Returns: boolean
      }
      approve_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      confirm_contribution_payment: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      execute_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      fail_contribution_payment: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      find_user_by_phone: {
        Args: { p_phone: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      flag_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: boolean
      }
      get_or_create_direct_conversation: {
        Args: { p_friend_id: string }
        Returns: string
      }
      get_or_create_group_conversation: {
        Args: { p_whip_id: string }
        Returns: string
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_wip_member: { Args: { p_whip_id: string }; Returns: boolean }
      is_wip_staff: { Args: { p_whip_id: string }; Returns: boolean }
      list_my_friends: {
        Args: never
        Returns: {
          email: string
          friendship_id: string
          full_name: string
          i_am_requester: boolean
          status: string
          user_id: string
        }[]
      }
      list_my_inbox: {
        Args: never
        Returns: {
          conversation_id: string | null
          last_message: string | null
          last_message_at: string | null
          target_id: string
          target_type: string
          title: string
        }[]
      }
      list_my_pending_invites: {
        Args: never
        Returns: {
          created_at: string
          id: string
          phone: string
          whip_id: string
          whip_title: string
        }[]
      }
      list_wip_contribution_plans: {
        Args: { p_whip_id: string }
        Returns: {
          amount: number
          full_name: string
          id: string
          installments_paid: number
          next_charge_date: string
          status: string
          total_installments: number
          user_id: string
        }[]
      }
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
      remove_friend: { Args: { p_user_id: string }; Returns: boolean }
      request_withdrawal: {
        Args: { p_amount: number; p_description: string; p_whip_id: string }
        Returns: string
      }
      respond_friend_request: {
        Args: { p_accept: boolean; p_friendship_id: string }
        Returns: boolean
      }
      send_friend_request: {
        Args: { p_user_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
      }
      send_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
      }
      set_rsvp: {
        Args: { p_occurrence_id: string; p_status: string }
        Returns: boolean
      }
      set_wip_rsvp: {
        Args: { p_status: string; p_whip_id: string }
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
