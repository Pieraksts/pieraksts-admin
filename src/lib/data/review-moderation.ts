/**
 * Review-report moderation cases — server-only Supabase reads via service-role RPC.
 *
 * Admin has no SHARED types sync from the backend contract; types here mirror
 * `ReviewModerationCase` from pieraksts-backend/contracts/types.ts.
 *
 * Resolution never deletes, hides, or edits the Review itself
 * (`resolve_review_moderation_case` only closes the case row).
 */
import { requireSuperadmin } from "@/lib/auth/require-superadmin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ReviewModerationStatusFilter = "open" | "resolved" | "all";

export type ReviewModerationCase = {
  id: string;
  reviewId: string;
  salonId: string;
  bookingId: string;
  reason: string | null;
  reportedAt: string;
  reportedByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  rating: number;
  note: string;
  clientName: string;
  serviceName: string;
  salonName: string;
};

type ReviewModerationCaseRow = {
  id: string;
  review_id: string;
  salon_id: string;
  booking_id: string;
  reason: string | null;
  reported_at: string;
  reported_by_user_id: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  resolution_note: string | null;
  rating: number;
  note: string;
  client_name: string;
  service_name: string;
  salon_name: string;
};

function mapCase(row: ReviewModerationCaseRow): ReviewModerationCase {
  return {
    id: row.id,
    reviewId: row.review_id,
    salonId: row.salon_id,
    bookingId: row.booking_id,
    reason: row.reason,
    reportedAt: row.reported_at,
    reportedByUserId: row.reported_by_user_id,
    resolvedAt: row.resolved_at,
    resolvedByUserId: row.resolved_by_user_id,
    resolutionNote: row.resolution_note,
    rating: row.rating,
    note: row.note,
    clientName: row.client_name,
    serviceName: row.service_name,
    salonName: row.salon_name,
  };
}

export async function getReviewModerationCases(
  status: ReviewModerationStatusFilter = "open",
): Promise<ReviewModerationCase[]> {
  await requireSuperadmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_admin_review_moderation_cases", {
    p_status: status,
  });

  if (error) {
    throw new Error(`getReviewModerationCases: ${error.message}`);
  }

  return ((data ?? []) as ReviewModerationCaseRow[]).map(mapCase);
}
