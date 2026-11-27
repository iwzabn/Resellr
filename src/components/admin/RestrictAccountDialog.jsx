import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { restrictAccount } from "@/lib/api/admin";

const ACTIONS = [
  { value: "warning", label: "Issue a warning" },
  { value: "account_limited", label: "Restrict the account" },
  { value: "account_suspended", label: "Suspend the account and pause listings" },
];

export function RestrictAccountDialog({ member, open, onOpenChange, onDone }) {
  const restrict = useServerFn(restrictAccount);
  const [action, setAction] = useState("warning");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (notes.trim().length < 10) {
      toast.error("Record a reason so the decision is auditable.");
      return;
    }
    setBusy(true);
    try {
      const result = await restrict({
        data: {
          user_id: member.id,
          label: member.full_name || member.email,
          action,
          notes: notes.trim(),
        },
      });
      toast.success(
        result.paused_listings
          ? `Decision recorded · ${result.paused_listings} listings paused`
          : "Moderation decision recorded",
      );
      setNotes("");
      onOpenChange(false);
      onDone?.();
    } catch (error) {
      toast.error(error?.message || "The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Moderate {member?.full_name || member?.email}</DialogTitle>
          <DialogDescription>
            The member is notified, the reason is recorded in the audit log, and they can appeal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Decision</Label>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ACTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-1"
              placeholder="What was verified, and what this decision addresses."
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            Save decision
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}