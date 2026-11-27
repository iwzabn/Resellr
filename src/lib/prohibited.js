// Words that make an item impossible to list regardless of how it is described.
// Shared by publishing, editing and the public item checker so all three agree.
export const PROHIBITED_TERMS = [
  "counterfeit",
  "replica",
  "knock off",
  "firearm",
  "ammunition",
  "vape",
  "nicotine",
  "prescription",
  "passport",
  "credit card",
  "gift card code",
  "stolen",
];

export const findProhibitedTerm = (text) => {
  const haystack = String(text || "").toLowerCase();
  return PROHIBITED_TERMS.find((term) => haystack.includes(term)) || null;
};