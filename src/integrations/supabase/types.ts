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
      bed_requests: {
        Row: {
          checked_in_at: string | null
          condition: string
          created_at: string
          hospital_id: string
          id: string
          notes: string | null
          patient_age: number | null
          patient_name: string
          patient_phone: string | null
          requester_id: string | null
          reservation_code: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          condition: string
          created_at?: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_age?: number | null
          patient_name: string
          patient_phone?: string | null
          requester_id?: string | null
          reservation_code?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          condition?: string
          created_at?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_age?: number | null
          patient_name?: string
          patient_phone?: string | null
          requester_id?: string | null
          reservation_code?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          method: string | null
          paid_at: string | null
          patient_id: string
          received_by: string | null
          status: string
          visit_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          method?: string | null
          paid_at?: string | null
          patient_id: string
          received_by?: string | null
          status?: string
          visit_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          patient_id?: string
          received_by?: string | null
          status?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_staff: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          city: string
          created_at: string
          distance_km: number
          icu_free: number
          icu_total: number
          id: string
          name: string
          ventilators: number
        }
        Insert: {
          city: string
          created_at?: string
          distance_km?: number
          icu_free?: number
          icu_total?: number
          id?: string
          name: string
          ventilators?: number
        }
        Update: {
          city?: string
          created_at?: string
          distance_km?: number
          icu_free?: number
          icu_total?: number
          id?: string
          name?: string
          ventilators?: number
        }
        Relationships: []
      }
      lab_tests: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          patient_id: string
          requested_by: string | null
          result: string | null
          status: string
          test_name: string
          visit_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          patient_id: string
          requested_by?: string | null
          result?: string | null
          status?: string
          test_name: string
          visit_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          requested_by?: string | null
          result?: string | null
          status?: string
          test_name?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          created_by: string | null
          full_name: string
          gender: string
          hospital_no: string
          id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          full_name: string
          gender?: string
          hospital_no?: string
          id?: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          gender?: string
          hospital_no?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          dosage: string
          drug: string
          duration: string
          frequency: string
          id: string
          patient_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dosage?: string
          drug: string
          duration?: string
          frequency?: string
          id?: string
          patient_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dosage?: string
          drug?: string
          duration?: string
          frequency?: string
          id?: string
          patient_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          complaint: string
          created_at: string
          created_by: string | null
          diagnosis: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          complaint?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          complaint?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      has_staff_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_staff: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "patient"
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
      app_role: ["admin", "staff", "patient"],
    },
  },
} as const
