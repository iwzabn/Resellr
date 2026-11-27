import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Ban, EyeOff, FileCheck, MapPin, MessageSquare, Scale } from "lucide-react";

export const Route = createFileRoute("/_site/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust, safety and how risk assessments work — Resellr" },
      {
        name: "description",
        content:
          "How Resellr assesses transaction risk, what we never assume, how location privacy works, and which products are prohibited.",
      },
    ],
  }),
});

const sections = [
  {
    icon: FileCheck,
    title: "What an assessment actually is",
    body: "An advisory summary built from the evidence on record about an enquiry: the listing, the arrangement proposed, the buyer's approximate region, verified platform history, and any community reports. Each factor is labelled verified, unverified, or context only, and the confidence is shown beside it.",
  },
  {
    icon: ShieldRules,
    title: "What we never do",
    body: "We never treat a new account as suspicious, and account age is never a factor. We never score a suburb, city or region as dangerous. We never invent reports, accusations or history. Absence of negative reports is never presented as proof of safety.",
  },
  {
    icon: MapPin,
    title: "Location privacy",
    body: "Sellers see only the approximate area a buyer chose to share — a city or state. Precise addresses, GPS position and contact details are never revealed by the platform. You decide when and where to meet.",
  },
  {
    icon: MessageSquare,
    title: "Your decision",
    body: "Accepting or declining an enquiry is entirely yours. Declining has no effect on seller ranking. Assessments exist to inform a judgement, not to replace it.",
  },
  {
    icon: Scale,
    title: "Reports, moderation and appeals",
    body: "Anyone signed in can report a listing or account with evidence. Reports stay unverified until a moderator reviews them. Verified and unverified reports are displayed differently, and a single unverified report never changes an assessment to low risk. You can appeal the outcome of a report from My reports.",
  },
  {
    icon: EyeOff,
    title: "Data we hold",
    body: "Your email is used for sign-in and platform emails. Your profile shows a username, bio, avatar and general area. Enquiries and messages are visible only to the buyer, the seller and platform moderators. Analytics events are aggregated and never shown alongside your identity.",
  },
];

const prohibited = [
  "Illegal goods and services of any kind",
  "Counterfeit or replica branded goods",
  "Weapons, firearm parts and restricted items",
  "Age-restricted products: alcohol, tobacco, vaping, adult content",
  "Prescription medicines and regulated substances",
  "Live animals and wildlife products",
  "Stolen goods or property without clear title",
  "Recalled or unsafe products",
  "Personal data, accounts, and digital credentials",
  "Financial instruments, vouchers and gift cards",
];

function ShieldRules(props) {
  return <AlertTriangle {...props} />;
}

function TrustPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="mono-pill">Trust & safety</p>
      <h1 className="mt-3 text-4xl font-extrabold">How transaction intelligence works</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Resellr helps resellers make informed decisions. It does not police transactions, and it never
        guarantees that a deal is safe. This page explains the limits as plainly as the capabilities.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-2 font-display text-base font-bold">{section.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Ban className="h-4 w-4 text-destructive" /> Prohibited products
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          These categories are not permitted on Resellr and are removed when found. Listing them can
          lead to account restrictions.
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {prohibited.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-destructive" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl bg-header p-6 text-header-foreground">
        <h2 className="font-display text-xl font-extrabold">Something not right?</h2>
        <p className="mt-1.5 max-w-xl text-sm text-white/70">
          Report the listing or account from its page. Moderators review the evidence, and you can
          appeal an outcome afterwards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/marketplace" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Browse the marketplace
          </Link>
          <Link to="/reports" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            My reports and appeals
          </Link>
        </div>
      </section>
    </div>
  );
}