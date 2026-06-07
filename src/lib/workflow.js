export function normalizePhase(value) {
  const raw = String(value || "").toLowerCase();
  if (["awaiting_upload", "awaiting_payment", "uploading", "processing", "needs_revision"].includes(raw)) return "awaiting_upload";
  if (["ready_for_review", "in_review"].includes(raw)) return "ready_for_review";
  if (["reviewed", "complete", "completed"].includes(raw)) return "reviewed";
  return "awaiting_upload";
}

export function phasePathForSubmission(row, base = "/dashboard/submissions") {
  const phase = normalizePhase(row.phase || row.status);
  return `${base}/${row._id}?phase=${phase}`;
}
