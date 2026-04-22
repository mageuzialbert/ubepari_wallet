import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminAction =
  | "kyc.approve"
  | "kyc.reject"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.image.upload"
  | "product.image.delete"
  | "product.image.reorder"
  | "order.cancel"
  | "order.activate"
  | "order.adjust_schedule"
  | "payment.reconcile"
  | "payment.refund"
  | "user.credit_limit.change"
  | "user.admin.grant"
  | "user.admin.revoke";

export type LogAdminInput = {
  actorId: string;
  action: AdminAction;
  targetTable?: string;
  targetId?: string;
  diff?: Record<string, unknown>;
};

export async function logAdmin(input: LogAdminInput): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("admin_audit_log")
    .insert({
      actor_id: input.actorId,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      diff: input.diff ?? {},
    });
  if (error) {
    console.error("[audit] insert failed", {
      action: input.action,
      error: error.message,
    });
  }
}
