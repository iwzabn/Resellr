export const formatPrice = (value, currency = "AUD") =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
};

export const CONDITION_OPTIONS = ["New", "Like new", "Refurbished", "Used · good", "Used · fair", "For parts"];

export const DELIVERY_OPTIONS = ["Collection", "Post", "Courier", "Local delivery"];

export const AU_REGIONS = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export const riskMeta = {
  low: { label: "Low concern", tone: "text-primary", dot: "bg-primary", ring: "border-primary/40 bg-primary/10" },
  caution: {
    label: "Caution",
    tone: "text-warning-foreground dark:text-warning",
    dot: "bg-warning",
    ring: "border-warning/50 bg-warning/15",
  },
  insufficient: {
    label: "Insufficient information",
    tone: "text-muted-foreground",
    dot: "bg-muted-foreground",
    ring: "border-border bg-muted",
  },
  pending: { label: "Assessing", tone: "text-muted-foreground", dot: "bg-muted-foreground", ring: "border-border bg-muted" },
};