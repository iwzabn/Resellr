import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      target_type: z.enum(["user", "listing"]),
      target_id: z.string().min(1).max(80),
      target_label: z.string().max(200).optional(),
      reason: z.enum([
        "suspected_scam",
        "misleading_listing",
        "counterfeit_product",
        "failed_transaction",
        "delivery_issue",
        "unsafe_arrangement",
        "harassment",
        "spam",
        "prohibited_product",
        "other",
      ]),
      description: z.string().min(20).max(2000),
      evidence_urls: z.array(z.string().max(500)).max(5).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [recentPage, targetPage] = await Promise.all([
      service.entities.CommunityReport
        .filter({ reporter_id: user.id, created_date: { $gte: dayAgo } }, { sort: "-created_date", limit: 50 })
        .catch(() => ({ items: [] })),
      service.entities.CommunityReport
        .filter({ target_id: data.target_id, created_date: { $gte: weekAgo } }, { limit: 100 })
        .catch(() => ({ items: [] })),
    ]);

    const recent = recentPage.items || [];
    if (recent.some((report) => report.target_id === data.target_id)) {
      throw new Error("You already reported this in the last 24 hours. Our moderators are reviewing it.");
    }
    // Guards against a single account using reports as a weapon: a hard daily
    // cap, and a flag when a burst of reports targets the same account.
    if (recent.length >= 10) {
      throw new Error("You have reached the daily limit for reports. Contact support if something is urgent.");
    }

    const againstTarget = targetPage.items || [];
    const distinctReporters = new Set(againstTarget.map((report) => report.reporter_id));
    const massReport = recent.length >= 3 || distinctReporters.size >= 5;

    const report = await service.entities.CommunityReport.create({
      target_type: data.target_type,
      target_id: data.target_id,
      target_label: data.target_label || "",
      reason: data.reason,
      description: data.description,
      evidence_urls: data.evidence_urls || [],
      reporter_id: user.id,
      reporter_name: user.full_name || "Member",
      status: "pending",
      verification: "unverified",
      appeal_status: "none",
      risk_signal: massReport ? "possible_mass_report" : "standard",
    });

    await service.entities.AuditLog.create({
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: "report.submitted",
      target_type: data.target_type,
      target_id: data.target_id,
      detail: `Reason: ${data.reason}`,
    });

    return {
      report_id: report.id,
      message:
        "Report received. It stays unverified until a moderator reviews the evidence, and it will not be shown as fact before then.",
    };
  });

export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      action: z.string().min(2).max(120),
      target_type: z.string().max(40).optional(),
      target_id: z.string().max(80).optional(),
      detail: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: data.action,
      target_type: data.target_type || "",
      target_id: data.target_id || "",
      detail: data.detail || "",
    });
    return { logged: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      report_id: z.string().min(1).max(80),
      status: z.enum(["under_review", "resolved", "dismissed"]),
      verification: z.enum(["unverified", "verified", "unsubstantiated"]),
      action: z.enum(["none", "warning", "listing_removed", "account_limited", "dismissed"]),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    const report = await service.entities.CommunityReport.get(data.report_id);
    if (!report) throw new Error("Report not found.");

    await service.entities.CommunityReport.update(report.id, {
      status: data.status,
      verification: data.verification,
      resolution_note: data.notes || "",
    });

    const moderationCase = await service.entities.ModerationCase.create({
      report_id: report.id,
      subject_type: report.target_type,
      subject_id: report.target_id,
      subject_label: report.target_label || report.target_id,
      action: data.action === "dismissed" ? "dismissed" : data.action,
      moderator_id: context.user.id,
      moderator_name: context.user.full_name || context.user.email,
      notes: data.notes || "",
      appeal_status: "none",
      case_type: "report",
      decided_at: new Date().toISOString(),
    });

    if (data.action === "listing_removed" && report.target_type === "listing") {
      await service.entities.Listing.update(report.target_id, {
        status: "removed",
        moderation_note: data.notes || "Removed after a moderation review.",
      }).catch(() => null);
    }

    await service.entities.Notification.create({
      user_id: report.created_by_id,
      type: "moderation",
      title: "Report reviewed",
      body: `Your report was reviewed: ${data.verification === "verified" ? "evidence upheld" : data.verification === "unsubstantiated" ? "not substantiated" : "recorded as unverified"}.`,
      link: "/reports",
    }).catch(() => null);

    // Only tell the affected member when a decision actually went against them,
    // so dismissed reports never become a way to harass someone.
    if (["warning", "listing_removed", "account_limited", "account_suspended"].includes(data.action)) {
      let affectedUserId = report.target_type === "user" ? report.target_id : null;
      if (!affectedUserId && report.target_type === "listing") {
        const listing = await service.entities.Listing.get(report.target_id).catch(() => null);
        affectedUserId = listing?.seller_id || null;
      }
      if (affectedUserId) {
        await service.entities.Notification.create({
          user_id: affectedUserId,
          type: "moderation",
          title: data.action === "warning" ? "Moderation warning" : "Moderation action on your account",
          body:
            data.action === "listing_removed"
              ? "A listing was removed after a moderation review. You can appeal the decision from your reports page."
              : `${data.notes || "A moderator reviewed activity on your account."} You can appeal this decision from your reports page.`,
          link: "/reports",
        }).catch(() => null);
      }
    }

    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: `report.${data.status}`,
      target_type: report.target_type,
      target_id: report.target_id,
      detail: `${data.verification} · ${data.action}${data.notes ? ` · ${data.notes.slice(0, 160)}` : ""}`,
    });

    return { case_id: moderationCase.id };
  });

export const purgeDemoData = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;
    const listings = await service.entities.Listing.deleteMany({ is_demo: true }).catch(() => ({ deleted: 0 }));
    const events = await service.entities.AnalyticsEvent.deleteMany({ is_demo: true }).catch(() => ({ deleted: 0 }));
    const ads = await service.entities.Advertisement.deleteMany({ is_demo: true }).catch(() => ({ deleted: 0 }));

    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: "demo.purged",
      detail: `listings ${listings.deleted || 0} · events ${events.deleted || 0} · ads ${ads.deleted || 0}`,
    });

    return { listings: listings.deleted || 0, events: events.deleted || 0, ads: ads.deleted || 0 };
  });

export const restrictAccount = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      user_id: z.string().min(1).max(80),
      label: z.string().max(160).optional(),
      action: z.enum(["warning", "account_limited", "account_suspended"]),
      notes: z.string().min(10).max(1000),
      report_id: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Admins only."), { status: 403 });
    }
    const service = context.getBase44().asServiceRole;

    const record = await service.entities.ModerationCase.create({
      case_type: "report",
      report_id: data.report_id || "",
      subject_type: "user",
      subject_id: data.user_id,
      subject_label: data.label || data.user_id,
      action: data.action,
      moderator_id: context.user.id,
      moderator_name: context.user.full_name || context.user.email,
      notes: data.notes,
      appeal_status: "none",
      decided_at: new Date().toISOString(),
    });

    let pausedListings = 0;
    if (data.action === "account_suspended") {
      const paused = await service.entities.Listing
        .updateMany({ seller_id: data.user_id, status: "active" }, { $set: { status: "paused" } })
        .catch(() => ({ updated: 0 }));
      pausedListings = paused.updated || 0;
    }

    await service.entities.Notification.create({
      user_id: data.user_id,
      type: "moderation",
      title: data.action === "warning" ? "Moderation warning" : "Your account has been restricted",
      body: `${data.notes} You can appeal this decision from your reports page.`,
      link: "/reports",
    }).catch(() => null);

    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: `account.${data.action}`,
      target_type: "user",
      target_id: data.user_id,
      detail: `${data.notes.slice(0, 240)}${pausedListings ? ` · ${pausedListings} listings paused` : ""}`,
    });

    return { case_id: record.id, paused_listings: pausedListings };
  });

export const appealReport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ report_id: z.string().min(1).max(80), note: z.string().min(20).max(1000) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const report = await service.entities.CommunityReport.get(data.report_id).catch(() => null);
    if (!report) throw new Error("Report not found.");
    const isOwner = report.created_by_id === context.user.id;
    const isAdmin = context.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw Object.assign(new Error("You can only appeal your own report."), { status: 403 });
    }

    await service.entities.CommunityReport.update(report.id, { appeal_status: "submitted" });
    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: "report.appeal_submitted",
      target_type: "report",
      target_id: report.id,
      detail: data.note.slice(0, 300),
    });
    return { appeal_status: "submitted" };
  });