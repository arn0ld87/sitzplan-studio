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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      klassen: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          notizen: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          notizen?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          notizen?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raeume: {
        Row: {
          breite_cm: number
          canvas_document: Json
          created_at: string
          deleted_at: string | null
          dokument_version: number
          id: string
          laenge_cm: number
          name: string
          raster_cm: number
          updated_at: string
          user_id: string
        }
        Insert: {
          breite_cm: number
          canvas_document?: Json
          created_at?: string
          deleted_at?: string | null
          dokument_version?: number
          id?: string
          laenge_cm: number
          name: string
          raster_cm: number
          updated_at?: string
          user_id: string
        }
        Update: {
          breite_cm?: number
          canvas_document?: Json
          created_at?: string
          deleted_at?: string | null
          dokument_version?: number
          id?: string
          laenge_cm?: number
          name?: string
          raster_cm?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schueler: {
        Row: {
          created_at: string
          deleted_at: string | null
          farb_index: number
          id: string
          initialen: string
          klasse_id: string
          merkmale: string[]
          nachname: string
          notiz: string
          updated_at: string
          user_id: string
          vorname: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          farb_index: number
          id?: string
          initialen: string
          klasse_id: string
          merkmale?: string[]
          nachname: string
          notiz?: string
          updated_at?: string
          user_id: string
          vorname: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          farb_index?: number
          id?: string
          initialen?: string
          klasse_id?: string
          merkmale?: string[]
          nachname?: string
          notiz?: string
          updated_at?: string
          user_id?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "schueler_klasse_id_fkey"
            columns: ["klasse_id"]
            isOneToOne: false
            referencedRelation: "klassen"
            referencedColumns: ["id"]
          },
        ]
      }
      sitzplaene: {
        Row: {
          canvas_document: Json
          created_at: string
          deleted_at: string | null
          dokument_version: number
          id: string
          klasse_id: string
          name: string
          raum_id: string
          revision: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_document: Json
          created_at?: string
          deleted_at?: string | null
          dokument_version?: number
          id?: string
          klasse_id: string
          name: string
          raum_id: string
          revision?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_document?: Json
          created_at?: string
          deleted_at?: string | null
          dokument_version?: number
          id?: string
          klasse_id?: string
          name?: string
          raum_id?: string
          revision?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitzplaene_klasse_id_fkey"
            columns: ["klasse_id"]
            isOneToOne: false
            referencedRelation: "klassen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitzplaene_raum_id_fkey"
            columns: ["raum_id"]
            isOneToOne: false
            referencedRelation: "raeume"
            referencedColumns: ["id"]
          },
        ]
      }
      sitzplan_versionen: {
        Row: {
          canvas_document: Json
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          sitzplan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_document: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          sitzplan_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_document?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          sitzplan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitzplan_versionen_sitzplan_id_fkey"
            columns: ["sitzplan_id"]
            isOneToOne: false
            referencedRelation: "sitzplaene"
            referencedColumns: ["id"]
          },
        ]
      }
      sitzregeln: {
        Row: {
          art: string
          created_at: string
          deleted_at: string | null
          id: string
          klasse_id: string
          schueler_a: string
          schueler_b: string
          updated_at: string
          user_id: string
        }
        Insert: {
          art: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          klasse_id: string
          schueler_a: string
          schueler_b: string
          updated_at?: string
          user_id: string
        }
        Update: {
          art?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          klasse_id?: string
          schueler_a?: string
          schueler_b?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitzregeln_klasse_id_fkey"
            columns: ["klasse_id"]
            isOneToOne: false
            referencedRelation: "klassen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitzregeln_schueler_a_fkey"
            columns: ["schueler_a"]
            isOneToOne: false
            referencedRelation: "schueler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitzregeln_schueler_b_fkey"
            columns: ["schueler_b"]
            isOneToOne: false
            referencedRelation: "schueler"
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
