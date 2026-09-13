export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "multiple_choice"
  | "yes_no"
  | "rating"
  | "statement"
  | "phone"
  | "date"
  | "file_upload";

export interface FieldCondition {
  /** ID do campo cujo valor dispara o salto */
  fieldId: string;
  operator: "equals" | "not_equals" | "contains";
  /** Valor(es) — múltiplos separados por vírgula para MC */
  value: string;
  /** ID do campo destino, "submit" para finalizar, "disqualify" para desqualificar */
  jumpTo: string;
  /** Mensagem exibida ao desqualificar (quando jumpTo === "disqualify") */
  disqualifyMessage?: string;
  /** URL de redirecionamento ao desqualificar */
  disqualifyUrl?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  scale?: number;
  description?: string;
  /** Lógica condicional: saltos baseados em resposta */
  conditions?: FieldCondition[];
  /** MQL: este campo define a qualificação de lead */
  isMqlField?: boolean;
  /** MQL: valor numérico mínimo para qualificar (para campos number/text). Padrão 100000 */
  mqlMinValue?: number;
  /** MQL: opções que qualificam (para campos multiple_choice) */
  mqlQualifyingOptions?: string[];
  /** MQL: resposta que qualifica em yes_no ("sim" | "nao") */
  mqlYesQualifies?: boolean;
  /** File upload: tipos aceitos ("image/*", "application/pdf", "*") */
  accept?: string;
  /** File upload: tamanho máximo em MB */
  maxSizeMb?: number;
}

export interface FormSettings {
  primaryColor: string;
  bgColor: string;
  logoUrl: string | null;
  redirectUrl: string | null;
  thankYouMessage: string;
  /** Pixel da Meta (Facebook) */
  metaPixelId?: string | null;
  /** Google Tag Manager ou GA4 */
  googleTagId?: string | null;
  /** Email para notificação de nova resposta */
  notificationEmail?: string | null;
  /** Webhook URL primária — POST com answers ao submeter */
  webhookUrl?: string | null;
  /** Webhooks adicionais (além da URL primária) */
  webhookUrls?: string[] | null;
  /** Fechar formulário após N respostas */
  maxResponses?: number | null;
  /** Fechar formulário após esta data (ISO) */
  closeAt?: string | null;
  /** Qual parâmetro UTM exibir na tabela de respostas */
  utmDisplayParam?: string | null;
  /** @deprecated MQL agora configurado nos campos (isMqlField) */
  mqlThreshold?: number | null;
  /** LGPD/GDPR: exibir caixa de consentimento antes de enviar */
  lgpdEnabled?: boolean;
  /** LGPD/GDPR: texto do consentimento */
  lgpdText?: string | null;
  /** LGPD/GDPR: link para a política de privacidade */
  lgpdPolicyUrl?: string | null;
  /** LGPD/GDPR: anonimizar IP antes de armazenar */
  anonymizeIp?: boolean;
  /** LGPD/GDPR: reter dados por N dias (0 = indefinido) */
  retentionDays?: number | null;
  /** Integrações configuradas: { make: { webhookUrl, enabled, connectedAt }, ... } */
  integrations?: Record<string, { webhookUrl?: string; enabled: boolean; connectedAt?: string }>;
}

export type WorkspaceRole = "admin" | "member" | "viewer";

export interface WebhookLog {
  id: string;
  form_id: string;
  submission_id: string | null;
  url: string;
  status_code: number | null;
  ok: boolean;
  error_msg: string | null;
  duration_ms: number | null;
  is_test: boolean;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profile: { name: string; email: string; avatar_url: string | null };
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string; email: string; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; name: string; email: string; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; email?: string; avatar_url?: string | null; updated_at?: string };
      };
      forms: {
        Row: { id: string; user_id: string; title: string; slug: string; settings: FormSettings; fields: FormField[]; is_published: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title?: string; slug: string; settings?: FormSettings; fields?: FormField[]; is_published?: boolean; created_at?: string; updated_at?: string };
        Update: { title?: string; slug?: string; settings?: FormSettings; fields?: FormField[]; is_published?: boolean; updated_at?: string };
      };
      submissions: {
        Row: { id: string; form_id: string; answers: Record<string, string | string[] | number>; metadata: SubmissionMetadata; created_at: string; status: string };
        Insert: { id?: string; form_id: string; answers: Record<string, string | string[] | number>; metadata?: SubmissionMetadata; created_at?: string; status?: string };
        Update: { status?: string };
      };
      form_events: {
        Row: { id: string; form_id: string; event_type: "view" | "start" | "abandon" | "complete"; question_index: number | null; session_id: string | null; metadata: Record<string, string>; created_at: string };
        Insert: { id?: string; form_id: string; event_type: "view" | "start" | "abandon" | "complete"; question_index?: number | null; session_id?: string | null; metadata?: Record<string, string>; created_at?: string };
        Update: never;
      };
    };
    Views: {
      forms_with_submission_count: {
        Row: { id: string; user_id: string; title: string; slug: string; settings: FormSettings; fields: FormField[]; is_published: boolean; created_at: string; updated_at: string; submission_count: number };
      };
    };
    Functions: {
      generate_slug: { Args: { title: string }; Returns: string };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Form = Database["public"]["Tables"]["forms"]["Row"];
export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type FormEvent = Database["public"]["Tables"]["form_events"]["Row"];
export type FormWithCount = Database["public"]["Views"]["forms_with_submission_count"]["Row"];
