import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findProhibitedTerm } from "@/lib/prohibited";

// ---------------------------------------------------------------------------
// Item validity check.
// One checker serves publishing, editing and the public tool. Rules run first and
// can block on their own; the model only judges what the rules cannot settle.
// The model never authenticates an item and never sees the seller.
// ---------------------------------------------------------------------------

const VERDICTS = ["allowed", "needs_review", "blocked"];

const CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: VERDICTS },
    reason: { type: "string" },
    issues: { type: "array", items: { type: "string" } },
    suggestion: { type: "string" },
  },
  required: ["verdict", "reason", "issues", "suggestion"],
};

const INSTRUCTIONS = `You check whether an item may be listed on "Resellr", an Australian reseller marketplace for second-hand and deadstock goods.

Choose exactly one verdict:
- "blocked": the item itself is illegal or not permitted: weapons, ammunition, explosives, drugs, nicotine or vaping products, alcohol to unverified buyers, prescription medicines, recalled or unsafe goods, counterfeit or replica goods, stolen property, personal identity documents, payment cards or codes, human remains, live animals, or anything that cannot lawfully be sold second-hand in Australia.
- "needs_review": not clearly prohibited, but it should not go live unchecked. Use this when authenticity, serial numbers or provenance need checking, when the item is age-restricted but lawful, when the wording hints at a replica, when the description or photo count is too thin to trust, or when the price does not fit what is claimed.
- "allowed": an ordinary lawful second-hand or new item, described clearly enough to list as it stands.

Rules:
- Judge two things: whether the item is allowed, and whether the listing is complete and credible enough to publish.
- Judge the item only. Never assess the person, their location or their account.
- You cannot verify authenticity. Never say an item is genuine, verified or authenticated.
- If the description is too vague to judge, or key facts are missing (model, size, condition, provenance), choose "needs_review" and name what is missing.
- Quality: name concrete gaps in the title, the description or the photo evidence, and any price that does not match the claimed item.
- issues: up to four short, concrete problems. suggestion: one short actionable fix, or an empty string.
- reason: at most two plain sentences.
Return JSON only.`;

const fingerprintOf = async (text) => {
  const data = new TextEncoder().encode(text.trim().toLowerCase().replace(/\s+/g, " "));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
};

const rulesVerdict = ({ title, description, category }) => {
  const term = findProhibitedTerm(`${title} ${description}`);
  if (term) {
    return {
      verdict: "blocked",
      reason: `The item mentions "${term}", which Resellr does not permit. Counterfeit, stolen, restricted and illegal goods cannot be listed.`,
      issues: [`Prohibited wording: ${term}`],
      suggestion: "Remove the item, or describe it honestly as a genuine lawful product.",
      model: "rules",
    };
  }
  if (category?.is_prohibited) {
    return {
      verdict: "blocked",
      reason: `${category.name} is a restricted category on Resellr and cannot be listed.`,
      issues: ["Restricted category"],
      suggestion: "Choose the category of a lawful product instead.",
      model: "rules",
    };
  }
  return null;
};

async function modelVerdict(service, { title, description, category, brand, price, condition, photoCount = 0 }) {
  try {
    const result = await service.integrations.Core.InvokeLLM({
      prompt: `${INSTRUCTIONS}

ITEM
- Title: ${title}
- Category: ${category?.name || "not given"}
- Brand: ${brand || "not given"}
- Condition: ${condition || "not given"}
- Photos supplied: ${photoCount > 0 ? photoCount : "not given"}
- Asking price: ${price ? `AUD ${price}` : "not given"}
- Description: ${description || "not given"}`,
      response_json_schema: CHECK_SCHEMA,
    });
    return {
      verdict: VERDICTS.includes(result?.verdict) ? result.verdict : "needs_review",
      reason: String(result?.reason || "").slice(0, 500),
      issues: (Array.isArray(result?.issues) ? result.issues : [])
        .map((issue) => String(issue).slice(0, 160))
        .slice(0, 4),
      suggestion: String(result?.suggestion || "").slice(0, 300),
      model: "automatic",
    };
  } catch (error) {
    console.error("[item check] model unavailable:", error?.message || error);
    return null;
  }
}

export async function runItemCheck(service, input) {
  const {
    title,
    description = "",
    category_slug = "",
    brand = "",
    price,
    condition,
    images = [],
    source = "public",
    userId = "",
  } = input;

  const categoryPage = category_slug
    ? await service.entities.Category.filter({ slug: category_slug }, { limit: 1 }).catch(() => ({ items: [] }))
    : { items: [] };
  const category = categoryPage.items?.[0] || null;

  const fingerprint = await fingerprintOf(`${category_slug}|${brand}|${condition}|${title}|${description}`);

  // An identical item is answered from the last week's verdict, so repeat checks
  // and refreshes never spend another AI request.
  const cachedPage = await service.entities.ItemCheck
    .filter({ fingerprint }, { sort: "-created_date", limit: 1 })
    .catch(() => ({ items: [] }));
  const cached = cachedPage.items?.[0];
  if (cached && Date.now() - new Date(cached.created_date || 0).getTime() < 7 * 24 * 60 * 60 * 1000) {
    return {
      verdict: cached.verdict,
      reason: cached.reason || "",
      issues: cached.issues || [],
      suggestion: cached.suggestion || "",
      cached: true,
    };
  }

  const photoCount = Array.isArray(images) ? images.length : 0;
  const result = rulesVerdict({ title, description, category }) ||
    (await modelVerdict(service, { title, description, category, brand, price, condition, photoCount })) || {
      // If the model cannot be reached the rules still apply, and the listing is
      // labelled so a moderator can look at it rather than being silently cleared.
      verdict: "needs_review",
      reason:
        "The automatic check could not be completed just now, so only the prohibited-items screening was applied. A moderator may review this listing.",
      issues: [],
      suggestion: "",
      model: "rules",
    };

  await service.entities.ItemCheck
    .create({
      fingerprint,
      source,
      title: title.slice(0, 120),
      category_slug,
      verdict: result.verdict,
      reason: result.reason,
      issues: result.issues,
      suggestion: result.suggestion,
      model: result.model,
      checked_by: userId,
    })
    .catch(() => null);

  return {
    verdict: result.verdict,
    reason: result.reason,
    issues: result.issues,
    suggestion: result.suggestion,
    cached: false,
  };
}

// Deliberately open to everyone, signed in or not: the tool is part of the public
// site. Input is bounded, identical items are cached for a week, and fresh checks
// are capped per hour and per day from the stored check records themselves, so the
// cap cannot be reset by the caller and the AI bill stays small.
export const checkItemPublic = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(3).max(120),
      description: z.string().max(1200).optional(),
      category_slug: z.string().max(60).optional(),
      brand: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const now = Date.now();
    const [hourly, daily] = await Promise.all([
      service.entities.ItemCheck
        .count({
          source: "public",
          created_date: { $gte: new Date(now - 60 * 60 * 1000).toISOString() },
        })
        .catch(() => 0),
      service.entities.ItemCheck
        .count({
          source: "public",
          created_date: { $gte: new Date(now - 24 * 60 * 60 * 1000).toISOString() },
        })
        .catch(() => 0),
    ]);
    if (hourly >= 30 || daily >= 200) {
      throw new Error("The item checker is very busy right now. Please try again a little later.");
    }
    return runItemCheck(service, { ...data, source: "public" });
  });