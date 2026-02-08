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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      exam_dates: {
        Row: {
          created_at: string
          exam_start_date: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_start_date: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_start_date?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          past_paper_id: string
          started_at: string
          total_possible_score: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          past_paper_id: string
          started_at?: string
          total_possible_score?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          past_paper_id?: string
          started_at?: string
          total_possible_score?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_past_paper_id_fkey"
            columns: ["past_paper_id"]
            isOneToOne: false
            referencedRelation: "past_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      past_papers: {
        Row: {
          created_at: string
          duration: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_writable: boolean
          name: string
          paper_type: Database["public"]["Enums"]["paper_type"] | null
          subject_id: string
          total_score: number
          year: string
        }
        Insert: {
          created_at?: string
          duration: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_writable?: boolean
          name: string
          paper_type?: Database["public"]["Enums"]["paper_type"] | null
          subject_id: string
          total_score: number
          year: string
        }
        Update: {
          created_at?: string
          duration?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_writable?: boolean
          name?: string
          paper_type?: Database["public"]["Enums"]["paper_type"] | null
          subject_id?: string
          total_score?: number
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_subjects: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_subjects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          name: string | null
          school_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          name?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          name?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string[]
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          id: string
          image_url: string | null
          marks: number
          options: string[] | null
          past_paper_id: string
          question_number: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          sample_answer: string | null
          subject_id: string
          topic_id: string | null
        }
        Insert: {
          correct_answer: string[]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          image_url?: string | null
          marks: number
          options?: string[] | null
          past_paper_id: string
          question_number: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          sample_answer?: string | null
          subject_id: string
          topic_id?: string | null
        }
        Update: {
          correct_answer?: string[]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          image_url?: string | null
          marks?: number
          options?: string[] | null
          past_paper_id?: string
          question_number?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          sample_answer?: string | null
          subject_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_past_paper_id_fkey"
            columns: ["past_paper_id"]
            isOneToOne: false
            referencedRelation: "past_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_notes: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          image_urls: string[] | null
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[] | null
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[] | null
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_compulsory: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_compulsory?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_compulsory?: boolean | null
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attempts: {
        Row: {
          attempted_at: string
          exam_session_id: string | null
          id: string
          is_correct: boolean
          marks_awarded: number
          question_id: string
          user_answer: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          exam_session_id?: string | null
          id?: string
          is_correct: boolean
          marks_awarded: number
          question_id: string
          user_answer: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          exam_session_id?: string | null
          id?: string
          is_correct?: boolean
          marks_awarded?: number
          question_id?: string
          user_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attempts_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: {
        Args: never
        Returns: {
          total_papers: number
          total_questions: number
          total_users: number
        }[]
      }
      get_questions_for_exam: {
        Args: { paper_id: string }
        Returns: {
          created_at: string
          difficulty: string
          id: string
          image_url: string
          marks: number
          options: string[]
          past_paper_id: string
          question_number: number
          question_text: string
          question_type: string
          subject_id: string
          topic_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "Easy" | "Medium" | "Hard"
      grade_level: "Seven" | "Nine" | "Twelve" | "GCE"
      paper_type: "Paper1" | "Paper2" | "Paper3"
      question_type: "MCQ" | "ShortAnswer" | "Essay"
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
      app_role: ["admin", "user"],
      difficulty_level: ["Easy", "Medium", "Hard"],
      grade_level: ["Seven", "Nine", "Twelve", "GCE"],
      paper_type: ["Paper1", "Paper2", "Paper3"],
      question_type: ["MCQ", "ShortAnswer", "Essay"],
    },
  },
} as const
