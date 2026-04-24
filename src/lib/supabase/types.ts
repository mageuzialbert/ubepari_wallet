// Minimal hand-rolled types to unblock the admin + server clients.
// Replace with `supabase gen types typescript --project-id zlvcpaiyjshsjglqicvy`
// once the CLI is linked.

export type KycStatus = "none" | "pending" | "approved" | "rejected";
export type OrderStatus = "pending" | "active" | "completed" | "cancelled";
export type PaymentKind = "deposit" | "installment" | "topup" | "refund" | "contribution";
export type PaymentProvider = "mpesa" | "tigopesa" | "airtelmoney" | "card";
export type PaymentStatus = "pending" | "success" | "failed";
export type WalletEntryKind = "credit" | "debit";
export type WalletBucket = "available" | "allocated";
export type GoalStatus = "active" | "completed" | "cancelled";

type ProfilesRow = {
  id: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  credit_limit_tzs: number;
  credit_points: number;
  kyc_status: KycStatus;
  is_admin: boolean;
  terms_version_accepted: string | null;
  terms_accepted_at: string | null;
  deleted_at: string | null;
  password_hash: string | null;
  password_set_at: string | null;
  password_failed_attempts: number;
  password_locked_until: string | null;
  created_at: string;
  updated_at: string;
};

type KycSubmissionsRow = {
  id: string;
  user_id: string;
  nida_number: string;
  legal_first_name: string;
  legal_last_name: string;
  id_doc_path: string;
  workplace: string | null;
  status: KycStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  id_doc_wiped_at: string | null;
};

type OrdersRow = {
  id: string;
  user_id: string;
  product_slug: string;
  plan_months: number;
  cash_price_tzs: number;
  deposit_tzs: number;
  financed_tzs: number;
  service_fee_tzs: number;
  total_tzs: number;
  monthly_tzs: number;
  status: OrderStatus;
  reference: string;
  created_at: string;
  activated_at: string | null;
  completed_at: string | null;
};

type OrderInstallmentsRow = {
  id: string;
  order_id: string;
  sequence: number;
  due_date: string;
  amount_tzs: number;
  paid_at: string | null;
  payment_id: string | null;
};

export type PaymentsRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  goal_id: string | null;
  kind: PaymentKind;
  amount_tzs: number;
  provider: PaymentProvider;
  evmark_ref: string | null;
  evmark_reference_id: string | null;
  status: PaymentStatus;
  raw_callback: Record<string, unknown> | null;
  created_at: string;
  settled_at: string | null;
};

export type GoalsRow = {
  id: string;
  user_id: string;
  product_slug: string;
  product_price_tzs: number;
  target_months: number;
  monthly_target_tzs: number;
  contributed_tzs: number;
  status: GoalStatus;
  reference: string;
  next_reminder_date: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  receipt_number: string | null;
  receipt_issued_at: string | null;
};

type WalletEntriesRow = {
  id: string;
  user_id: string;
  kind: WalletEntryKind;
  bucket: WalletBucket;
  allocation_goal_id: string | null;
  amount_tzs: number;
  payment_id: string | null;
  note_key: string;
  note_params: Record<string, unknown>;
  created_at: string;
};

type WalletBalancesRow = {
  user_id: string;
  bucket: WalletBucket;
  balance_tzs: number;
};

type OtpChallengesRow = {
  id: string;
  phone: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
  created_at: string;
};

type ProductsRow = {
  id: string;
  slug: string;
  brand: string;
  name_en: string;
  name_sw: string;
  tagline_en: string;
  tagline_sw: string;
  description_en: string;
  description_sw: string;
  cash_price_tzs: number;
  specs: Record<string, unknown>;
  usage_tags: string[];
  stock: number;
  featured: boolean;
  color_accent: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductImagesRow = {
  id: string;
  product_id: string;
  path: string;
  position: number;
  alt_en: string | null;
  alt_sw: string | null;
  created_at: string;
};

type AdminAuditLogRow = {
  id: string;
  actor_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  diff: Record<string, unknown>;
  created_at: string;
};

export type AiMessageRole = "user" | "assistant" | "tool" | "system";

type AiConversationsRow = {
  id: string;
  user_id: string;
  locale: "en" | "sw";
  title: string | null;
  created_at: string;
  updated_at: string;
};

type AiMessagesRow = {
  id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  tool_calls: Record<string, unknown>[] | null;
  tool_call_id: string | null;
  tool_name: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: Pick<ProfilesRow, "id" | "phone"> &
          Partial<Omit<ProfilesRow, "id" | "phone" | "created_at" | "updated_at">>;
        Update: Partial<Omit<ProfilesRow, "id" | "created_at">>;
        Relationships: [];
      };
      kyc_submissions: {
        Row: KycSubmissionsRow;
        Insert: Omit<
          KycSubmissionsRow,
          | "id"
          | "submitted_at"
          | "reviewed_at"
          | "reviewed_by"
          | "review_notes"
          | "status"
          | "id_doc_wiped_at"
        > & {
          id?: string;
          status?: KycStatus;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          id_doc_wiped_at?: string | null;
        };
        Update: Partial<KycSubmissionsRow>;
        Relationships: [];
      };
      orders: {
        Row: OrdersRow;
        Insert: Omit<
          OrdersRow,
          "id" | "created_at" | "activated_at" | "completed_at" | "status"
        > & {
          id?: string;
          status?: OrderStatus;
          activated_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<OrdersRow>;
        Relationships: [];
      };
      order_installments: {
        Row: OrderInstallmentsRow;
        Insert: Omit<OrderInstallmentsRow, "id" | "paid_at" | "payment_id"> & {
          id?: string;
          paid_at?: string | null;
          payment_id?: string | null;
        };
        Update: Partial<OrderInstallmentsRow>;
        Relationships: [];
      };
      payments: {
        Row: PaymentsRow;
        Insert: Omit<
          PaymentsRow,
          "id" | "created_at" | "settled_at" | "status" | "evmark_ref" | "evmark_reference_id" | "raw_callback" | "order_id" | "goal_id"
        > & {
          id?: string;
          order_id?: string | null;
          goal_id?: string | null;
          status?: PaymentStatus;
          evmark_ref?: string | null;
          evmark_reference_id?: string | null;
          raw_callback?: Record<string, unknown> | null;
          settled_at?: string | null;
        };
        Update: Partial<PaymentsRow>;
        Relationships: [];
      };
      goals: {
        Row: GoalsRow;
        Insert: Omit<
          GoalsRow,
          | "id"
          | "created_at"
          | "status"
          | "contributed_tzs"
          | "next_reminder_date"
          | "completed_at"
          | "cancelled_at"
          | "cancellation_reason"
          | "receipt_number"
          | "receipt_issued_at"
        > & {
          id?: string;
          status?: GoalStatus;
          contributed_tzs?: number;
          next_reminder_date?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          receipt_number?: string | null;
          receipt_issued_at?: string | null;
        };
        Update: Partial<GoalsRow>;
        Relationships: [];
      };
      wallet_entries: {
        Row: WalletEntriesRow;
        Insert: Omit<
          WalletEntriesRow,
          "id" | "created_at" | "note_params" | "payment_id" | "allocation_goal_id"
        > & {
          id?: string;
          payment_id?: string | null;
          allocation_goal_id?: string | null;
          note_params?: Record<string, unknown>;
        };
        Update: Partial<WalletEntriesRow>;
        Relationships: [];
      };
      otp_challenges: {
        Row: OtpChallengesRow;
        Insert: Pick<OtpChallengesRow, "phone" | "code_hash" | "expires_at"> & {
          id?: string;
          consumed_at?: string | null;
          attempts?: number;
        };
        Update: Partial<OtpChallengesRow>;
        Relationships: [];
      };
      products: {
        Row: ProductsRow;
        Insert: Omit<
          ProductsRow,
          "id" | "created_at" | "updated_at" | "active" | "featured" | "stock" | "color_accent" | "specs" | "usage_tags"
        > & {
          id?: string;
          active?: boolean;
          featured?: boolean;
          stock?: number;
          color_accent?: string | null;
          specs?: Record<string, unknown>;
          usage_tags?: string[];
        };
        Update: Partial<ProductsRow>;
        Relationships: [];
      };
      product_images: {
        Row: ProductImagesRow;
        Insert: Omit<ProductImagesRow, "id" | "created_at" | "position" | "alt_en" | "alt_sw"> & {
          id?: string;
          position?: number;
          alt_en?: string | null;
          alt_sw?: string | null;
        };
        Update: Partial<ProductImagesRow>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: Pick<AdminAuditLogRow, "actor_id" | "action"> & {
          id?: string;
          target_table?: string | null;
          target_id?: string | null;
          diff?: Record<string, unknown>;
        };
        Update: Partial<AdminAuditLogRow>;
        Relationships: [];
      };
      ai_conversations: {
        Row: AiConversationsRow;
        Insert: Pick<AiConversationsRow, "user_id" | "locale"> & {
          id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<AiConversationsRow>;
        Relationships: [];
      };
      ai_messages: {
        Row: AiMessagesRow;
        Insert: Pick<AiMessagesRow, "conversation_id" | "role" | "content"> & {
          id?: string;
          tool_calls?: Record<string, unknown>[] | null;
          tool_call_id?: string | null;
          tool_name?: string | null;
          created_at?: string;
        };
        Update: Partial<AiMessagesRow>;
        Relationships: [];
      };
    };
    Views: {
      wallet_balances: {
        Row: WalletBalancesRow;
        Relationships: [];
      };
    };
    Functions: {
      increment_goal_contribution: {
        Args: { p_goal_id: string; p_amount: number };
        Returns: GoalsRow | null;
      };
      allocate_to_goal: {
        Args: { p_user_id: string; p_goal_id: string; p_amount: number };
        Returns: GoalsRow;
      };
      cancel_goal_and_refund: {
        Args: { p_goal_id: string; p_user_id: string; p_reason: string | null };
        Returns: GoalsRow;
      };
    };
    Enums: {
      kyc_status: KycStatus;
      order_status: OrderStatus;
      payment_kind: PaymentKind;
      payment_provider: PaymentProvider;
      payment_status: PaymentStatus;
      wallet_entry_kind: WalletEntryKind;
      wallet_bucket: WalletBucket;
      goal_status: GoalStatus;
    };
  };
};
