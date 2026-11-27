import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { buildAdminAnalytics, buildSellerInsights } from "@/lib/insights.server";
import { standingFor } from "@/lib/standing.server";
import { computeTrends, emptyTrends } from "@/lib/trends.server";

// ---------------------------------------------------------------------------
// Marketplace trends (public, aggregated only)
// ---------------------------------------------------------------------------
export const getTrends = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        period: z.number().int().optional(),
        category: z.string().max(60).optional(),
        country: z.string().max(60).optional(),
      })
      .optional(),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    try {
      return await computeTrends(service, {
        period: data?.period || 30,
        category: data?.category || "",
        country: data?.country || "",
      });
    } catch {
      return emptyTrends(data?.period || 30);
    }
  });

// ---------------------------------------------------------------------------
// Seller insights and AI recommendations
// ---------------------------------------------------------------------------
export const getSellerInsights = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ period: z.number().int().optional() }).optional())
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    return buildSellerInsights(service, context.user.id, { period: data?.period || 30 });
  });

export const dismissRecommendation = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const record = await service.entities.AIRecommendations.get(data.id).catch(() => null);
    if (!record) return { dismissed: false };
    if (record.seller_id !== context.user.id && context.user.role !== "admin") {
      throw Object.assign(new Error("That recommendation is not yours."), { status: 403 });
    }
    await service.entities.AIRecommendations.update(record.id, { status: "dismissed" });
    return { dismissed: true };
  });

// ---------------------------------------------------------------------------
// Approximate location disclosure
// ---------------------------------------------------------------------------
export const getLocationPreference = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const page = await service.entities.LocationPreferences
      .filter({ user_id: context.user.id }, { limit: 1 })
      .catch(() => ({ items: [] }));
    return (
      page.items?.[0] || {
        user_id: context.user.id,
        share_location: false,
        granularity: "region",
        city: "",
        region: "",
      }
    );
  });

export const updateLocationPreference = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      share_location: z.boolean(),
      granularity: z.enum(["hidden", "region", "city"]),
      city: z.string().max(80).optional(),
      region: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const page = await service.entities.LocationPreferences
      .filter({ user_id: context.user.id }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const payload = {
      user_id: context.user.id,
      share_location: data.share_location,
      granularity: data.share_location ? data.granularity : "hidden",
      city: data.city || "",
      region: data.region || "",
      disclosure_note: data.share_location
        ? "Sellers you contact see an approximate area only. Your address and live location are never shared."
        : "You are not sharing any location information with sellers.",
    };

    const existing = page.items?.[0];
    if (existing) {
      await service.entities.LocationPreferences.update(existing.id, payload);
      return { ...existing, ...payload };
    }
    return service.entities.LocationPreferences.create({ ...payload, created_by_id: context.user.id });
  });

// ---------------------------------------------------------------------------
// Assessment accuracy feedback and moderation appeals
// ---------------------------------------------------------------------------
export const getMyStanding = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const standing = await standingFor(service, context.user.id);
    return {
      standing: standing.standing,
      active: standing.active.map((row) => ({
        id: row.id,
        action: row.action,
        notes: row.notes,
        appeal_status: row.appeal_status,
        decided_at: row.decided_at || row.created_date,
      })),
      warnings: standing.warnings.map((row) => ({
        id: row.id,
        notes: row.notes,
        appeal_status: row.appeal_status,
        decided_at: row.decided_at || row.created_date,
      })),
    };
  });

export const appealModeration = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ case_id: z.string().min(1).max(80), note: z.string().min(20).max(1000) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const record = await service.entities.ModerationCase.get(data.case_id).catch(() => null);
    if (!record || record.subject_id !== context.user.id) {
      throw Object.assign(new Error("That decision is not on your account."), { status: 403 });
    }
    if (record.appeal_status !== "none") throw new Error("An appeal has already been submitted for this decision.");

    await service.entities.ModerationCase.update(record.id, {
      appeal_status: "submitted",
      appeal_note: data.note,
      appeal_at: new Date().toISOString(),
    });
    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: "moderation.appeal_submitted",
      target_type: "moderation_case",
      target_id: record.id,
      detail: data.note.slice(0, 300),
    });
    return { appeal_status: "submitted" };
  });

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------
export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    return buildAdminAnalytics(service);
  });

export const getModerationQueues = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    const [assessments, cases] = await Promise.all([
      service.entities.RiskAssessment.filter({ review_status: "requested" }, { limit: 50 }).catch(() => ({ items: [] })),
      service.entities.ModerationCase.filter({ appeal_status: "submitted" }, { limit: 50 }).catch(() => ({ items: [] })),
    ]);
    return { assessments: assessments.items || [], appeals: cases.items || [] };
  });

export const resolveAssessmentReview = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      assessment_id: z.string().min(1).max(80),
      outcome: z.enum(["reviewed", "corrected"]),
      note: z.string().min(10).max(1000),
      set_level: z.enum(["keep", "insufficient"]).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    const assessment = await service.entities.RiskAssessment.get(data.assessment_id).catch(() => null);
    if (!assessment) throw new Error("Assessment not found.");

    await service.entities.RiskAssessment.update(assessment.id, {
      review_status: data.outcome,
      review_outcome: data.note,
      review_note: assessment.review_note || "",
      reviewed_by: context.user.full_name || context.user.email,
      ...(data.set_level === "insufficient" ? { level: "insufficient", confidence: 0 } : {}),
    });

    if (assessment.enquiry_id) {
      const enquiry = await service.entities.Enquiry.get(assessment.enquiry_id).catch(() => null);
      if (data.set_level === "insufficient") {
        await service.entities.Enquiry.update(assessment.enquiry_id, {
          risk_level: "insufficient",
          risk_confidence: 0,
          risk_summary: data.note,
        }).catch(() => null);
      }
      if (enquiry?.seller_id) {
        await service.entities.Notification.create({
          user_id: enquiry.seller_id,
          type: "moderation",
          title: "Assessment reviewed",
          body:
            data.set_level === "insufficient"
              ? "A moderator reviewed the transaction assessment and set it back to insufficient information."
              : "A moderator reviewed the transaction assessment on one of your enquiries.",
          link: `/enquiries/${enquiry.id}`,
        }).catch(() => null);
      }
    }

    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: `assessment.${data.outcome}`,
      target_type: "risk_assessment",
      target_id: assessment.id,
      detail: data.note.slice(0, 300),
    });

    return { reviewed: true };
  });

export const resolveAppeal = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      case_id: z.string().min(1).max(80),
      decision: z.enum(["upheld", "denied"]),
      note: z.string().min(10).max(1000),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    const record = await service.entities.ModerationCase.get(data.case_id).catch(() => null);
    if (!record) throw new Error("Case not found.");

    await service.entities.ModerationCase.update(record.id, {
      appeal_status: data.decision,
      appeal_outcome_note: data.note,
    });

    if (record.subject_id) {
      await service.entities.Notification.create({
        user_id: record.subject_id,
        type: "moderation",
        title: data.decision === "upheld" ? "Appeal upheld" : "Appeal outcome",
        body:
          data.decision === "upheld"
            ? "Your appeal was upheld and the restriction has been lifted."
            : "Your appeal was reviewed and the original decision stands.",
        link: "/reports",
      }).catch(() => null);
    }

    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: `appeal.${data.decision}`,
      target_type: "moderation_case",
      target_id: record.id,
      detail: data.note.slice(0, 300),
    });

    return { appeal_status: data.decision };
  });