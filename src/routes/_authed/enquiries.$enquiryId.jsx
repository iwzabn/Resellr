import { useState } from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Flag,
  MapPin,
  MessageSquare,
  ShieldQuestion,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskPanel } from "@/components/risk/RiskPanel";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { AssessmentFeedback } from "@/components/risk/AssessmentFeedback";
import { MessageThread } from "@/components/messaging/MessageThread";
import { ReportDialog } from "@/components/listing/ReportDialog";
import { useAuth } from "@/lib/AuthContext";
import { getEnquiryDetail, respondEnquiry, sendMessage } from "@/lib/api/enquiries";
import { formatDateTime, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authed/enquiries/$enquiryId")({
  loader: async ({ params }) => {
    const result = await getEnquiryDetail({ data: { enquiry_id: params.enquiryId } });
    if (!result) throw notFound();
    return result;
  },
  component: EnquiryDetailPage,
  head: () => ({ meta: [{ title: "Enquiry — Resellr" }] }),
});

const ACTION_COPY = {
  accept: { title: "Accept this enquiry?", cta: "Accept enquiry" },
  reject: { title: "Decline this enquiry?", cta: "Decline enquiry" },
  request_info: { title: "Ask for more information", cta: "Send request" },
};

function EnquiryDetailPage() {
  const initial = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const respond = useServerFn(respondEnquiry);
  const send = useServerFn(sendMessage);

  const [messages, setMessages] = useState(initial.messages);
  const [status, setStatus] = useState(initial.enquiry.status);
  const [sending, setSending] = useState(false);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { enquiry, assessment, viewer, reports_summary } = initial;
  const isSeller = viewer === "seller";

  const handleSend = async (text) => {
    setSending(true);
    try {
      const result = await send({ data: { conversation_id: enquiry.conversation_id, body: text } });
      setMessages((current) => [...current, result.message]);
    } catch (err) {
      toast.error(err?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const submitAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const result = await respond({
        data: { enquiry_id: enquiry.id, action, note: note.trim() || undefined },
      });
      setStatus(result.status);
      toast.success(
        action === "accept" ? "Enquiry accepted" : action === "reject" ? "Enquiry declined" : "Information requested",
      );
      setAction(null);
      setNote("");
      router.invalidate();
    } catch (err) {
      toast.error(err?.message || "That response could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const locationLabel =
    enquiry.location_source === "self_reported"
      ? "Approximate · provided by the buyer for this enquiry, unverified"
      : enquiry.location_source === "profile"
        ? "Approximate · from the buyer's sharing settings, unverified"
        : "Not shared by the buyer";

  const riskSection = (
    <div className="space-y-3">
      <RiskPanel assessment={assessment} />
      {isSeller && <AssessmentFeedback assessment={assessment} />}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link to="/enquiries" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to enquiries
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono-pill">
            Enquiry · {viewer === "buyer" ? "sent" : "received"} · {formatDateTime(enquiry.created_date)}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{enquiry.listing_title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPrice(enquiry.listing_price, enquiry.listing_currency)} ·{" "}
            {isSeller ? `From ${enquiry.buyer_name || "buyer"}` : `Seller: ${enquiry.seller_name || "reseller"}`} · status{" "}
            <span className="font-medium capitalize text-foreground">{status.replace("_", " ")}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSeller && <RiskBadge level={assessment?.level || enquiry.risk_level} confidence={assessment?.confidence} />}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <ShieldQuestion className="mr-1.5 h-3.5 w-3.5" /> Risk intelligence
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle className="font-display">Transaction intelligence</DrawerTitle>
              </DrawerHeader>
              <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{riskSection}</div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                The enquiry
              </p>
              <Link
                to="/listings/$listingId"
                params={{ listingId: enquiry.listing_id }}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                View listing
              </Link>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{enquiry.buyer_message}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Arrangement
                </dt>
                <dd className="mt-0.5">{enquiry.arrangement || "Not stated"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Approximate area
                </dt>
                <dd className="mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {[enquiry.buyer_city, enquiry.buyer_region].filter(Boolean).join(", ") || "Not shared"}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] uppercase leading-tight tracking-wider text-muted-foreground">
                    {locationLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Messages
                </dt>
                <dd className="mt-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" /> {messages.length}
                </dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Only this general area is shared by the platform. Precise addresses and live location
              are never revealed — share a meeting place yourself when you are ready.
            </p>
          </section>

          {isSeller && (
            <section className="rounded-xl border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Your decision
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setAction("accept")}
                  disabled={status === "accepted"}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAction("request_info")}>
                  Ask for more info
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setAction("reject")}
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Declining is always allowed and never lowers your seller ranking. The assessment is
                advisory; the decision stays yours.
              </p>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Message thread
              </p>
            </div>
            <MessageThread
              messages={messages}
              currentUserId={user?.id}
              onSend={handleSend}
              sending={sending}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {isSeller ? (
            <div className="hidden lg:block">{riskSection}</div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                What happens next
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The seller reviews your enquiry and either accepts, asks for more detail, or declines.
                You'll see the outcome here and in notifications.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Community standing
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {reports_summary.verified + reports_summary.unverified === 0
                ? "No community reports are on record for this account. That is not a guarantee of safety either."
                : `${reports_summary.verified} verified and ${reports_summary.unverified} unverified report(s) on record.`}
            </p>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3 w-3" />
              {isSeller ? "Report a concern about this buyer" : "Report a concern"}
            </button>
          </div>
        </aside>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{ACTION_COPY[action]?.title}</DialogTitle>
            <DialogDescription>
              Add an optional note for {enquiry.buyer_name || "the buyer"}. It appears in the message
              thread.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={
              action === "accept"
                ? "Happy to proceed. I can meet Saturday morning near the station."
                : action === "request_info"
                  ? "Could you confirm when you'd like to collect?"
                  : "This one isn't the right fit for me — thanks for looking."
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button onClick={submitAction} disabled={busy}>
              {ACTION_COPY[action]?.cta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        targetType="user"
        targetId={enquiry.buyer_id}
        targetLabel={enquiry.buyer_name || "Buyer"}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}