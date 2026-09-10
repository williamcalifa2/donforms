// Auto-gerado a partir do schema Supabase.
// Para regenerar: npm run db:types
// Atualizar manualmente ao mudar o schema até configurar o CLI.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Field types suportados no player ────────────────────────────────────────
export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "multiple_choice";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  /** Para multiple_choice */
  options?: string[];
  /** Para number: valor mínimo/máximo */
  min?: number;
  max?: number;
}

export interface FormSettings {
  primaryColor: string;
  bgColor: string;
  logoUrl: string | null;
  redirectUrl: string | null;
  thankYouMessage: string;
}

export interface SubmissionMetadata {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  user_agent?: string;
  referrer?: string;
}

// ─── Database schema types ────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      forms: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          settings: FormSettings;
          fields: FormField[];
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          slug: string;
          settings?: FormSettings;
          fields?: FormField[];
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          settings?: FormSettings;
          fields?: FormField[];
          is_published?: boolean;
          updated_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          form_id: string;
          answers: Record<string, string | string[] | number>;
          metadata: SubmissionMetadata;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          answers: Record<string, string | string[] | number>;
          metadata?: SubmissionMetadata;
          created_at?: string;
        };
        Update: never; // submissions são imutáveis
      };
    };
    Views: {
      forms_with_submission_count: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          settings: FormSettings;
          fields: FormField[];
          is_published: boolean;
          created_at: string;
          updated_at: string;
          submission_count: number; // bigint no DB, number no JS
        };
      };
    };
    Functions: {
      generate_slug: {
        Args: { title: string };
        Returns: string;
      };
    };
  };
}

// ─── Helpers de conveniência ──────────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Form = Database["public"]["Tables"]["forms"]["Row"];
export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type FormWithCount =
  Database["public"]["Views"]["forms_with_submission_count"]["Row"];
