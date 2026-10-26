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
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          entity_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_id: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dept_head"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          document_number: string | null
          employee_id: string
          expiry_date: string | null
          has_us_visa: boolean | null
          id: string
          issued_date: string | null
          issuer: string | null
          name: string
          nationality: string | null
          notes: string | null
          scope: string
          size_bytes: number | null
          storage_path: string
          type: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          document_number?: string | null
          employee_id: string
          expiry_date?: string | null
          has_us_visa?: boolean | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          scope?: string
          size_bytes?: number | null
          storage_path: string
          type: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          document_number?: string | null
          employee_id?: string
          expiry_date?: string | null
          has_us_visa?: boolean | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          scope?: string
          size_bytes?: number | null
          storage_path?: string
          type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_date: string
          condition: string
          created_at: string
          employee_id: string
          id: string
          name: string
          notes: string | null
          returned_date: string | null
          serial_number: string | null
          type: string
        }
        Insert: {
          assigned_date?: string
          condition?: string
          created_at?: string
          employee_id: string
          id?: string
          name: string
          notes?: string | null
          returned_date?: string | null
          serial_number?: string | null
          type?: string
        }
        Update: {
          assigned_date?: string
          condition?: string
          created_at?: string
          employee_id?: string
          id?: string
          name?: string
          notes?: string | null
          returned_date?: string | null
          serial_number?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          day_off: string
          id: string
          is_recurring: boolean
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          date: string
          day_off: string
          id?: string
          is_recurring?: boolean
          name: string
          year: number
        }
        Update: {
          created_at?: string
          date?: string
          day_off?: string
          id?: string
          is_recurring?: boolean
          name?: string
          year?: number
        }
        Relationships: []
      }
      leave_audit_log: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          new_status: string | null
          old_status: string | null
          performed_by: string
          request_id: string
          request_snapshot: Json | null
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          old_status?: string | null
          performed_by: string
          request_id: string
          request_snapshot?: Json | null
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          old_status?: string | null
          performed_by?: string
          request_id?: string
          request_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_audit_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          annual_carried_over: number
          annual_total: number
          annual_used: number
          carried_over_expires: string | null
          employee_id: string
          id: string
          sick_total: number
          sick_used: number
          updated_at: string
          year: number
        }
        Insert: {
          annual_carried_over?: number
          annual_total?: number
          annual_used?: number
          carried_over_expires?: string | null
          employee_id: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          year: number
        }
        Update: {
          annual_carried_over?: number
          annual_total?: number
          annual_used?: number
          carried_over_expires?: string | null
          employee_id?: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policy: {
        Row: {
          content: string
          created_at: string
          id: string
          published: boolean
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_policy_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_id: string | null
          approver_note: string | null
          created_at: string
          days_count: number
          document_name: string | null
          document_path: string | null
          edited_at: string | null
          employee_id: string
          end_date: string
          id: string
          previous_status: string | null
          reason: string | null
          request_id: string | null
          return_date: string | null
          reviewed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          approver_note?: string | null
          created_at?: string
          days_count: number
          document_name?: string | null
          document_path?: string | null
          edited_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          previous_status?: string | null
          reason?: string | null
          request_id?: string | null
          return_date?: string | null
          reviewed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          approver_note?: string | null
          created_at?: string
          days_count?: number
          document_name?: string | null
          document_path?: string | null
          edited_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          previous_status?: string | null
          reason?: string | null
          request_id?: string | null
          return_date?: string | null
          reviewed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          type?: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_config: {
        Row: {
          active: boolean
          approval_required: string
          created_at: string
          deducts_balance: boolean
          default_days: number | null
          document_label: string | null
          gender_restriction: string | null
          id: string
          label: string
          notes: string | null
          paid: boolean | null
          requires_document: boolean
          type: string
        }
        Insert: {
          active?: boolean
          approval_required?: string
          created_at?: string
          deducts_balance?: boolean
          default_days?: number | null
          document_label?: string | null
          gender_restriction?: string | null
          id?: string
          label: string
          notes?: string | null
          paid?: boolean | null
          requires_document?: boolean
          type: string
        }
        Update: {
          active?: boolean
          approval_required?: string
          created_at?: string
          deducts_balance?: boolean
          default_days?: number | null
          document_label?: string | null
          gender_restriction?: string | null
          id?: string
          label?: string
          notes?: string | null
          paid?: boolean | null
          requires_document?: boolean
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["task_category"]
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          is_template: boolean
          notes: string | null
          order_index: number
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          is_template?: boolean
          notes?: string | null
          order_index?: number
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          is_template?: boolean
          notes?: string | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          description: string | null
          due_days: number | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          city: string | null
          contract_end_date: string | null
          contract_type: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_id: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          health_insurance: boolean | null
          hire_date: string | null
          iban: string | null
          id: string
          job_title: string | null
          languages: string[] | null
          last_name: string | null
          manager_id: string | null
          nationality: string | null
          office: string | null
          performance_evaluation_date: string | null
          personal_email: string | null
          phone: string | null
          postal_code: string | null
          probation_end_date: string | null
          probation_start_date: string | null
          probation_status: string | null
          role: Database["public"]["Enums"]["user_role"]
          state_region: string | null
          status: Database["public"]["Enums"]["employee_status"]
          street: string | null
          timezone: string | null
          updated_at: string
          work_arrangement: string | null
          work_schedule: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          contract_end_date?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          health_insurance?: boolean | null
          hire_date?: string | null
          iban?: string | null
          id: string
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          manager_id?: string | null
          nationality?: string | null
          office?: string | null
          performance_evaluation_date?: string | null
          personal_email?: string | null
          phone?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          probation_start_date?: string | null
          probation_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state_region?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          street?: string | null
          timezone?: string | null
          updated_at?: string
          work_arrangement?: string | null
          work_schedule?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          contract_end_date?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          health_insurance?: boolean | null
          hire_date?: string | null
          iban?: string | null
          id?: string
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          manager_id?: string | null
          nationality?: string | null
          office?: string | null
          performance_evaluation_date?: string | null
          personal_email?: string | null
          phone?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          probation_start_date?: string | null
          probation_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state_region?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          street?: string | null
          timezone?: string | null
          updated_at?: string
          work_arrangement?: string | null
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["cycle_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["cycle_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["cycle_status"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          cycle_id: string
          employee_id: string
          goals: Json | null
          id: string
          manager_comments: string | null
          manager_rating: number | null
          reviewer_id: string
          self_comments: string | null
          self_rating: number | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          employee_id: string
          goals?: Json | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id: string
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          employee_id?: string
          goals?: Json | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id?: string
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
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
      carry_over_annual_leave: {
        Args: { from_year: number; max_carry_over?: number }
        Returns: undefined
      }
      get_my_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_hr_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      cycle_status: "draft" | "active" | "completed"
      doc_type: "contract" | "id" | "certificate" | "policy" | "other"
      employee_status: "active" | "inactive" | "on_leave"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "annual"
        | "sick"
        | "unpaid"
        | "maternity"
        | "paternity"
        | "marriage"
        | "bereavement"
        | "blood_donation"
        | "child_care"
        | "compassionate"
        | "work_from_home"
        | "business_travel"
        | "training"
        | "other"
      review_status: "pending" | "self_review" | "manager_review" | "completed"
      task_category:
        | "documentation"
        | "training"
        | "setup"
        | "meeting"
        | "other"
      user_role: "admin" | "hr_manager" | "employee"
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
    Enums: {
      cycle_status: ["draft", "active", "completed"],
      doc_type: ["contract", "id", "certificate", "policy", "other"],
      employee_status: ["active", "inactive", "on_leave"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "annual",
        "sick",
        "unpaid",
        "maternity",
        "paternity",
        "marriage",
        "bereavement",
        "blood_donation",
        "child_care",
        "compassionate",
        "work_from_home",
        "business_travel",
        "training",
        "other",
      ],
      review_status: ["pending", "self_review", "manager_review", "completed"],
      task_category: ["documentation", "training", "setup", "meeting", "other"],
      user_role: ["admin", "hr_manager", "employee"],
    },
  },
} as const
