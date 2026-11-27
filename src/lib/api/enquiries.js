import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { activeRestriction } from "@/lib/standing.server";

// ---------------------------------------------------------------------------
// Transaction risk intelligence.
// Deterministic guardrails run after the model: a brand-new account is never
// treated as risk, location is never scored, unverified reports can never on
// their own produce a "low" reading, and thin evidence always resolves to
// "insufficient" rather than being dressed up as reassurance.
// ---------------------------------------------------------------------------

const RISK_SCHEMA = {
  type: "object",
  properties: {
    level: { type: "string", enum: ["low", "caution", "insufficient"] },
    confidence: { type: "number" },
    summary: { type: "string" },
    factors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          evidence_type: { type: "string", enum: ["verified", "unverified", "context"] },
        },
        required: ["label", "detail", "evidence_type"],
      },
    },
    missing_info: { type: "array", items: { type: "string" } },
  },
  required: ["level", "confidence", "summary", "factors", "missing_info"],
};

const RISK_INSTRUCTIONS = `You are a transaction-risk analyst for "Resellr", an Australian reseller marketplace. A seller has received a buyer enquiry and wants help deciding whether to proceed. You produce an advisory assessment only.

Hard rules:
1. Never treat a new account, short account age, or low activity as risk. Do not mention account age at all.
2. Never infer that a suburb, city, region, postcode, or demographic is dangerous or suspicious. Location may only be described as context ("buyer is in a different state"), never scored.
3. Use only the evidence provided. Never invent reports, accusations, records, or history. If evidence is thin, choose "insufficient".
4. Mark each factor's evidence_type: "verified" (platform-recorded data), "unverified" (a report nobody has confirmed), or "context" (self-described or arrangement detail).
5. Absence of negative reports is not proof of safety: say this explicitly in the summary when level is "insufficient".
6. You cannot choose "low" unless there is verified positive evidence (for example completed accepted transactions recorded by the platform). Otherwise choose "insufficient", or "caution" only when there is at least one unverified report worth raising.
7. Be concise, neutral, and specific. Never accuse the buyer of anything.
8. Fill missing_info with the concrete checks the seller could still make (for example: confirm the item condition in person, agree a public meeting place, avoid upfront deposits to unverified accounts).

Return JSON only, matching the provided schema.`;

async function gatherEvidence(service, { enquiry, listing, buyer, buyerProfile }) {
  const [buyerReports, buyerEnquiries] = await Promise.all([
    service.entities.CommunityReport
      .filter({ target_type: "user", target_id: enquiry.buyer_id }, { limit: 50 })
      .catch(() => ({ items: [] })),
    service.entities.Enquiry.filter({ buyer_id: enquiry.buyer_id }, { limit: 100 }).catch(() => ({ items: [] })),
  ]);

  const reports = buyerReports.items || [];
  const enquiries = buyerEnquiries.items || [];

  return {
    reports,
    verified_reports: reports.filter((r) => r.verification === "verified").length,
    unverified_reports: reports.filter((r) => r.verification === "unverified" && r.status !== "dismissed").length,
    unsubstantiated_reports: reports.filter((r) => r.verification === "unsubstantiated").length,
    previous_enquiries: enquiries.length,
    previous_accepted: enquiries.filter((e) => e.status === "accepted").length,
    profile_completeness: [buyerProfile?.bio, buyerProfile?.city, buyerProfile?.region, buyerProfile?.avatar_url].filter(
      Boolean,
    ).length,
    listing_title: listing.title,
    listing_price: listing.price,
    listing_currency: listing.currency || "AUD",
    listing_category: listing.category_name,
    arrangement: enquiry.arrangement || "not stated",
    buyer_area: [enquiry.buyer_city, enquiry.buyer_region].filter(Boolean).join(", ") || "not shared",
    location_disclosure:
      enquiry.location_source === "not_shared"
        ? "the buyer has chosen not to share their area"
        : `approximate area ${[enquiry.buyer_city, enquiry.buyer_region].filter(Boolean).join(", ")} (self-reported, unverified)`,
    identity_verification: buyerProfile?.verified_seller
      ? "a contact and seller verification is on file"
      : "no optional identity or contact verification has been completed",
    buyer_name: buyer?.full_name || enquiry.buyer_name || "buyer",
  };
}

function enforceGuardrails(assessment, evidence) {
  const verifiedPositive = evidence.previous_accepted >= 3;
  const verifiedNegative = evidence.verified_reports > 0;
  const unverifiedNegative = evidence.unverified_reports > 0;
  let level = ["low", "caution", "insufficient"].includes(assessment.level) ? assessment.level : "insufficient";
  const missing = Array.isArray(assessment.missing_info) ? assessment.missing_info.slice(0, 5) : [];

  if (level === "low" && !verifiedPositive) level = "insufficient";
  if (verifiedNegative) level = "caution";
  // Caution has to point at something real: with no report of any kind on
  // record, treat the reading as insufficient rather than raising vague doubt.
  if (level === "caution" && !verifiedNegative && !unverifiedNegative) level = "insufficient";

  const factors = (Array.isArray(assessment.factors) ? assessment.factors : [])
    .slice(0, 5)
    .map((factor) => ({
      label: String(factor.label || "Observation").slice(0, 60),
      detail: String(factor.detail || "").slice(0, 320),
      evidence_type: ["verified", "unverified", "context"].includes(factor.evidence_type)
        ? factor.evidence_type
        : "context",
    }));

  if (unverifiedNegative && !factors.some((f) => f.evidence_type === "unverified")) {
    factors.push({
      label: "Unconfirmed community report",
      detail: `${evidence.unverified_reports} report(s) exist about this account but no moderator has verified them. Treat as unconfirmed.`,
      evidence_type: "unverified",
    });
  }

  if (level === "insufficient" && !missing.some((m) => /no negative|not a guarantee|absence/i.test(m))) {
    missing.push("No negative reports is not a guarantee of safety.");
  }

  const confidence = Math.max(0, Math.min(100, Math.round(Number(assessment.confidence) || 0)));
  const cappedConfidence = level === "insufficient" ? Math.min(confidence, 45) : confidence;

  return {
    level,
    confidence: cappedConfidence,
    summary: String(assessment.summary || "").slice(0, 600),
    factors,
    missing_info: missing,
    evidence_counts: `verified reports ${evidence.verified_reports} · unverified reports ${evidence.unverified_reports} · prior enquiries ${evidence.previous_enquiries} · accepted ${evidence.previous_accepted}`,
    generated_reason: `Generated automatically when this enquiry was sent. Evidence read: ${evidence.verified_reports} moderator-verified report(s), ${evidence.unverified_reports} unverified report(s), ${evidence.previous_enquiries} previous enquir${evidence.previous_enquiries === 1 ? "y" : "ies"} and ${evidence.previous_accepted} accepted enquir${evidence.previous_accepted === 1 ? "y" : "ies"} on this account. Account age, neighbourhood and personal characteristics were not used.`,
    verification_note: evidence.identity_verification,
    location_note: evidence.location_disclosure,
  };
}

function fallbackAssessment(evidence) {
  return {
    level: "insufficient",
    confidence: 0,
    summary:
      "There is not enough evidence about this account to say anything useful either way. That is not a warning and not a clearance: judge the arrangements yourself and use a safe payment and meeting approach.",
    factors: [
      {
        label: "Evidence available",
        detail: `${evidence.previous_enquiries} previous enquiries on record, ${evidence.verified_reports} verified reports.`,
        evidence_type: "verified",
      },
    ],
    missing_info: [
      "No verified transaction history yet.",
      "No confirmed identity or contact verification on file.",
      "No negative reports is not a guarantee of safety.",
    ],
    evidence_counts: `verified reports ${evidence.verified_reports} · unverified reports ${evidence.unverified_reports}`,
    generated_reason: `Generated automatically when this enquiry was sent, but the assessment model could not be reached, so only recorded counts are shown. Evidence read: ${evidence.verified_reports} verified report(s), ${evidence.unverified_reports} unverified report(s), ${evidence.previous_enquiries} previous enquiries. Account age, neighbourhood and personal characteristics were not used.`,
    verification_note: evidence.identity_verification,
    location_note: evidence.location_disclosure,
  };
}

async function assessTransaction(service, { enquiry, listing, buyer, buyerProfile }) {
  const evidence = await gatherEvidence(service, { enquiry, listing, buyer, buyerProfile });

  if (evidence.verified_reports > 0) {
    // A moderator-confirmed report is the one case where we skip the model and
    // state the recorded evidence plainly.
    const assessment = enforceGuardrails(
      {
        level: "caution",
        confidence: 80,
        summary:
          "A moderator has verified at least one community report about this account. The assessment below lists only what is on record, and none of it says how this particular deal will go.",
        factors: [
          {
            label: "Verified community report",
            detail: `${evidence.verified_reports} report(s) about this account have been reviewed and upheld by moderators.`,
            evidence_type: "verified",
          },
        ],
        missing_info: ["What actually happened is not established for this transaction."],
      },
      evidence,
    );
    return { assessment, evidence };
  }

  try {
    const result = await service.integrations.Core.InvokeLLM({
      prompt: `${RISK_INSTRUCTIONS}

EVIDENCE (only use this):
- Listing: ${evidence.listing_title} · ${evidence.listing_currency} ${evidence.listing_price} · category ${evidence.listing_category}
- Proposed arrangement from the buyer: ${evidence.arrangement}
- Buyer location disclosure: ${evidence.location_disclosure} — describe only as context, never score it
- Optional verification: ${evidence.identity_verification}
- Buyer profile completeness: ${evidence.profile_completeness} of 4 optional fields filled
- Previous enquiries from this buyer on the platform: ${evidence.previous_enquiries}
- Enquiries the seller accepted from this buyer: ${evidence.previous_accepted}
- Community reports against this buyer: ${evidence.verified_reports} verified, ${evidence.unverified_reports} unverified and unresolved, ${evidence.unsubstantiated_reports} unsubstantiated
- No other history exists in the system.

Write the seller-facing assessment.`,
      response_json_schema: RISK_SCHEMA,
    });
    return { assessment: enforceGuardrails(result || {}, evidence), evidence };
  } catch {
    return { assessment: fallbackAssessment(evidence), evidence };
  }
}

async function saveAssessment(service, enquiry, assessment) {
  const existing = await service.entities.RiskAssessment
    .filter({ enquiry_id: enquiry.id }, { limit: 5 })
    .catch(() => ({ items: [] }));

  for (const record of existing.items || []) {
    await service.entities.RiskAssessment.delete(record.id).catch(() => null);
  }

  await service.entities.RiskAssessment.create({
    enquiry_id: enquiry.id,
    level: assessment.level,
    confidence: assessment.confidence,
    summary: assessment.summary,
    factors: assessment.factors,
    missing_info: assessment.missing_info,
    evidence_counts: assessment.evidence_counts,
    generated_reason: assessment.generated_reason,
    verification_note: assessment.verification_note,
    location_note: assessment.location_note,
    review_status: "none",
    model: "automatic",
  });

  await service.entities.Enquiry.update(enquiry.id, {
    risk_level: assessment.level,
    risk_confidence: assessment.confidence,
    risk_summary: assessment.summary,
  });
}

export const createEnquiry = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      listing_id: z.string().min(1).max(80),
      message: z.string().min(10).max(2000),
      arrangement: z.string().max(240).optional(),
      buyer_city: z.string().max(80).optional(),
      buyer_region: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    const listing = await service.entities.Listing.get(data.listing_id).catch(() => null);
    if (!listing || listing.status !== "active") throw new Error("This listing is no longer available.");
    if (listing.created_by_id === user.id || listing.seller_id === user.id) {
      throw new Error("You cannot send an enquiry about your own listing.");
    }

    const recentCount = await service.entities.Enquiry
      .count({ buyer_id: user.id, created_date: { $gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() } })
      .catch(() => 0);
    if (recentCount >= 10) {
      throw new Error("You have sent a lot of enquiries in the last hour. Please try again a little later.");
    }

    const restriction = await activeRestriction(service, user.id);
    if (restriction?.action === "account_suspended") {
      throw new Error("Your account is suspended, so new enquiries cannot be sent. You can appeal from your reports page.");
    }

    const [profilePage, preferencePage] = await Promise.all([
      service.entities.UserProfile.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      service.entities.LocationPreferences.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
    ]);
    const profile = profilePage.items?.[0] || null;
    const preference = preferencePage.items?.[0] || null;

    // Location is shared at an approximate granularity only, and only when the
    // buyer typed it into this enquiry or opted in to sharing in their settings.
    const typed = { city: data.buyer_city || "", region: data.buyer_region || "" };
    let locationSource = "not_shared";
    let buyerArea = { city: "", region: "" };
    if (typed.city || typed.region) {
      locationSource = "self_reported";
      buyerArea = { city: typed.city, region: typed.region };
    } else if (preference?.share_location) {
      locationSource = "profile";
      buyerArea = {
        city: preference.granularity === "city" ? preference.city || profile?.city || "" : "",
        region: preference.granularity === "hidden" ? "" : preference.region || profile?.region || "",
      };
    }

    const conversation = await service.entities.Conversation.create({
      enquiry_id: "",
      listing_id: listing.id,
      listing_title: listing.title,
      participants: [user.id, listing.seller_id].filter(Boolean),
      participant_names: [user.full_name || "Buyer", listing.seller_name || "Seller"],
      last_message: data.message.slice(0, 240),
      last_message_date: new Date().toISOString(),
    });

    const enquiry = await service.entities.Enquiry.create({
      listing_id: listing.id,
      listing_title: listing.title,
      listing_price: listing.price,
      listing_currency: listing.currency || "AUD",
      listing_image: listing.images?.[0] || "",
      seller_id: listing.seller_id,
      seller_name: listing.seller_name,
      buyer_id: user.id,
      buyer_name: user.full_name || "Buyer",
      buyer_username: profile?.username || "",
      buyer_city: buyerArea.city,
      buyer_region: buyerArea.region,
      location_source: locationSource,
      location_granularity: preference?.granularity || (typed.city ? "city" : typed.region ? "region" : "hidden"),
      buyer_message: data.message,
      arrangement: data.arrangement || "",
      status: "pending",
      risk_level: "pending",
      conversation_id: conversation.id,
    });

    await service.entities.Conversation.update(conversation.id, { enquiry_id: enquiry.id });
    await service.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_name: user.full_name || "Buyer",
      body: data.message,
      is_system: false,
    });
    await service.entities.Listing.update(listing.id, {
      enquiry_count: (listing.enquiry_count || 0) + 1,
    });
    await service.entities.AnalyticsEvent.create({
      event_type: "enquiry",
      listing_id: listing.id,
      category_slug: listing.category_slug,
      category_name: listing.category_name,
      brand: listing.brand,
      seller_id: listing.seller_id,
      region: listing.region,
      is_demo: !!listing.is_demo,
    });
    await service.entities.Notification.create({
      user_id: listing.seller_id,
      type: "enquiry",
      title: "New enquiry",
      body: `${user.full_name || "A buyer"} asked about ${listing.title}`,
      link: `/enquiries/${enquiry.id}`,
    });

    const { assessment } = await assessTransaction(service, { enquiry, listing, buyer: user, buyerProfile: profile });
    await saveAssessment(service, enquiry, assessment);

    return {
      enquiry_id: enquiry.id,
      conversation_id: conversation.id,
      risk: assessment,
    };
  });

export const getEnquiryDetail = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ enquiry_id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const enquiry = await service.entities.Enquiry.get(data.enquiry_id).catch(() => null);
    if (!enquiry) return null;

    const isSeller = enquiry.seller_id === context.user.id;
    const isBuyer = enquiry.buyer_id === context.user.id;
    if (!isSeller && !isBuyer && context.user.role !== "admin") {
      throw Object.assign(new Error("You do not have access to this enquiry."), { status: 403 });
    }

    const [assessmentPage, messagesPage, conversation] = await Promise.all([
      service.entities.RiskAssessment.filter({ enquiry_id: enquiry.id }, { limit: 1 }).catch(() => ({ items: [] })),
      service.entities.Message
        .filter({ conversation_id: enquiry.conversation_id }, { sort: "created_date", limit: 200 })
        .catch(() => ({ items: [] })),
      enquiry.conversation_id
        ? service.entities.Conversation.get(enquiry.conversation_id).catch(() => null)
        : null,
    ]);

    const buyerReports = await service.entities.CommunityReport
      .filter({ target_type: "user", target_id: enquiry.buyer_id }, { limit: 10 })
      .catch(() => ({ items: [] }));

    return {
      enquiry,
      assessment: assessmentPage.items?.[0] || null,
      messages: messagesPage.items || [],
      conversation,
      reports_summary: {
        verified: (buyerReports.items || []).filter((r) => r.verification === "verified").length,
        unverified: (buyerReports.items || []).filter((r) => r.verification === "unverified").length,
      },
      viewer: isSeller ? "seller" : isBuyer ? "buyer" : "admin",
    };
  });

export const respondEnquiry = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      enquiry_id: z.string().min(1).max(80),
      action: z.enum(["accept", "reject", "request_info"]),
      note: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const enquiry = await service.entities.Enquiry.get(data.enquiry_id).catch(() => null);
    if (!enquiry) throw new Error("Enquiry not found.");
    if (enquiry.seller_id !== context.user.id && context.user.role !== "admin") {
      throw Object.assign(new Error("Only the seller can respond to this enquiry."), { status: 403 });
    }

    const status = { accept: "accepted", reject: "rejected", request_info: "info_requested" }[data.action];
    const label = {
      accept: "Enquiry accepted",
      reject: "Enquiry declined",
      request_info: "More information requested",
    }[data.action];

    await service.entities.Enquiry.update(enquiry.id, {
      status,
      decided_at: new Date().toISOString(),
      seller_notes: data.note || "",
    });

    if (enquiry.conversation_id) {
      await service.entities.Message.create({
        conversation_id: enquiry.conversation_id,
        sender_id: context.user.id,
        sender_name: context.user.full_name || "Seller",
        body: data.note ? `${label}: ${data.note}` : label,
        is_system: true,
      });
      await service.entities.Conversation.update(enquiry.conversation_id, {
        last_message: data.note ? `${label}: ${data.note}` : label,
        last_message_date: new Date().toISOString(),
      });
    }

    await service.entities.Notification.create({
      user_id: enquiry.buyer_id,
      type: data.action === "accept" ? "accepted" : data.action === "reject" ? "rejected" : "info_requested",
      title: label,
      body: `${enquiry.seller_name || "The seller"} responded to your enquiry about ${enquiry.listing_title}`,
      link: `/enquiries/${enquiry.id}`,
    });

    return { status };
  });

export const requestAssessmentReview = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ assessment_id: z.string().min(1).max(80), note: z.string().min(10).max(800) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const assessment = await service.entities.RiskAssessment.get(data.assessment_id).catch(() => null);
    if (!assessment) throw new Error("Assessment not found.");
    const enquiry = await service.entities.Enquiry.get(assessment.enquiry_id).catch(() => null);
    if (!enquiry || enquiry.seller_id !== context.user.id) {
      throw Object.assign(new Error("Only the seller on this enquiry can flag its assessment."), { status: 403 });
    }
    if (assessment.review_status === "requested") return { review_status: "requested" };

    await service.entities.RiskAssessment.update(assessment.id, {
      review_status: "requested",
      review_note: data.note,
    });
    await service.entities.AuditLog.create({
      actor_id: context.user.id,
      actor_name: context.user.full_name || context.user.email,
      action: "assessment.review_requested",
      target_type: "risk_assessment",
      target_id: assessment.id,
      detail: data.note.slice(0, 300),
    });
    return { review_status: "requested" };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ conversation_id: z.string().min(1).max(80), body: z.string().min(1).max(2000) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const conversation = await service.entities.Conversation.get(data.conversation_id).catch(() => null);
    if (!conversation) throw new Error("Conversation not found.");
    if (!(conversation.participants || []).includes(context.user.id)) {
      throw Object.assign(new Error("You are not part of this conversation."), { status: 403 });
    }

    const message = await service.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: context.user.id,
      sender_name: context.user.full_name || "Member",
      body: data.body,
      is_system: false,
    });
    await service.entities.Conversation.update(conversation.id, {
      last_message: data.body.slice(0, 240),
      last_message_date: new Date().toISOString(),
    });

    const other = (conversation.participants || []).find((id) => id !== context.user.id);
    if (other) {
      await service.entities.Notification.create({
        user_id: other,
        type: "message",
        title: "New message",
        body: `${context.user.full_name || "A member"}: ${data.body.slice(0, 90)}`,
        link: `/messages/${conversation.id}`,
      });
    }

    return { message };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const page = await service.entities.Conversation
      .filter({ participants: context.user.id }, { sort: "-last_message_date", limit: 50 })
      .catch(() => ({ items: [] }));
    return { conversations: page.items || [] };
  });

export const getConversationThread = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ conversation_id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const conversation = await service.entities.Conversation.get(data.conversation_id).catch(() => null);
    if (!conversation) return null;
    if (!(conversation.participants || []).includes(context.user.id) && context.user.role !== "admin") {
      throw Object.assign(new Error("You are not part of this conversation."), { status: 403 });
    }
    const messages = await service.entities.Message
      .filter({ conversation_id: conversation.id }, { sort: "created_date", limit: 200 })
      .catch(() => ({ items: [] }));
    return { conversation, messages: messages.items || [] };
  });