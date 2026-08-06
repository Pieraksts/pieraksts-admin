"use server";

/**
 * Server actions for review-report moderation. Resolution closes the case row
 * only — it must never delete or mutate `salon_reviews`.
 */
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/require-superadmin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function resolveReviewModerationCase(
  caseId: string,
  resolutionNote: string,
) {
  const { userId } = await requireSuperadmin();
  if (!caseId || caseId.trim().length === 0) {
    throw new Error("resolveReviewModerationCase: case id is required");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("resolve_review_moderation_case", {
    p_case_id: caseId,
    p_actor_user_id: userId,
    p_resolution_note:
      resolutionNote.trim() === "" ? null : resolutionNote.trim(),
  });

  if (error) {
    throw new Error(`resolveReviewModerationCase: ${error.message}`);
  }

  revalidatePath("/review-reports");
  revalidatePath("/");
}
