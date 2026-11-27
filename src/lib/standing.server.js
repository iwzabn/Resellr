// Account standing derived from moderator decisions. A restriction only lifts
// when a moderator upholds an appeal, so the enforcement rule lives in one place.
const RESTRICTING_ACTIONS = ["account_limited", "account_suspended"];

export async function standingFor(service, userId) {
  const page = await service.entities.ModerationCase
    .filter({ subject_type: "user", subject_id: userId }, { sort: "-created_date", limit: 50 })
    .catch(() => ({ items: [] }));

  const cases = page.items || [];
  const active = cases.filter((row) => RESTRICTING_ACTIONS.includes(row.action) && row.appeal_status !== "upheld");
  const warnings = cases.filter((row) => row.action === "warning");

  return {
    standing: active.length
      ? active.some((row) => row.action === "account_suspended")
        ? "suspended"
        : "restricted"
      : warnings.length
        ? "warning"
        : "clear",
    active,
    warnings,
    history: cases,
  };
}

export async function activeRestriction(service, userId) {
  const standing = await standingFor(service, userId);
  return standing.active[0] || null;
}