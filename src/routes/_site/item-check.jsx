import { createFileRoute, Link } from "@tanstack/react-router";
import ItemCheckForm from "@/components/item-check/ItemCheckForm";

export const Route = createFileRoute("/_site/item-check")({
  component: ItemCheckPage,
  head: () => ({
    meta: [
      { title: "AI item check — Resellr" },
      {
        name: "description",
        content:
          "Check whether an item can be listed on Resellr before you publish it. Free to use, no account needed.",
      },
    ],
  }),
});

function ItemCheckPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="mono-pill">Open tool · no account needed</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Check an item before you list it</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Describe what you want to sell and the checker tells you whether it can go on Resellr, what a
        moderator would question, and how to fix the wording. Anyone can use it, signed in or not.
      </p>

      <div className="mt-6">
        <ItemCheckForm />
      </div>

      <p className="mt-6 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        The check is automated guidance. It never verifies that an item is genuine, and it is not a
        valuation. Every listing is still screened before it goes live.{" "}
        <Link to="/trust" className="font-medium text-primary hover:underline">
          Read the rules
        </Link>
        .
      </p>
    </div>
  );
}