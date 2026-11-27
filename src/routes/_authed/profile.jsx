import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { LocationSharingCard } from "@/components/account/LocationSharingCard";
import { getMyAccount, updateMyProfile } from "@/lib/api/account";
import { useAuth } from "@/lib/AuthContext";
import { AU_REGIONS, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/profile")({
  loader: () => getMyAccount(),
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Your profile — Resellr" }] }),
});

function ProfilePage() {
  const account = Route.useLoaderData();
  const { refresh } = useAuth();
  const save = useServerFn(updateMyProfile);
  const [form, setForm] = useState({
    username: account.profile?.username || "",
    bio: account.profile?.bio || "",
    avatar_url: account.profile?.avatar_url || "",
    country: account.profile?.country || "Australia",
    city: account.profile?.city || "",
    region: account.profile?.region || "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadPublicFile({ file });
      if (result?.file_url) set("avatar_url", result.file_url);
    } catch {
      toast.error("That image could not be uploaded.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.username.trim().length < 3) {
      setError("Usernames need at least 3 characters.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: form });
      await refresh();
      toast.success("Profile saved");
    } catch (err) {
      setError(err?.message || "Your profile could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const memberSince = account.profile?.seller_since || account.subscription?.created_date;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mono-pill">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The same account buys and sells — switch any time. Only your username, bio and general area
        are shown publicly.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-xl font-bold text-accent-foreground">
              {form.avatar_url ? (
                <Image src={form.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (form.username || account.user.email || "R").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-primary/50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Stored publicly — anyone with the link can open it. Avoid personal photos.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-username">Username</Label>
              <Input
                id="profile-username"
                value={form.username}
                onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))}
                className="mt-1.5"
                maxLength={30}
                required
              />
            </div>
            <div>
              <Label htmlFor="profile-country">Country</Label>
              <Input
                id="profile-country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className="mt-1.5"
                maxLength={60}
              />
            </div>
            <div>
              <Label htmlFor="profile-city">City or suburb</Label>
              <Input
                id="profile-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Sydney"
                className="mt-1.5"
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="profile-region">State / region</Label>
              <select
                id="profile-region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
              >
                <option value="">Choose…</option>
                {AU_REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor="profile-bio">About you</Label>
            <Textarea
              id="profile-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="What you sell, how you package, when you post."
              className="mt-1.5"
              maxLength={600}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile
        </Button>
      </form>

      <div className="mt-6">
        <LocationSharingCard
          preference={account.location}
          defaultCity={form.city}
          defaultRegion={form.region}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</p>
          <p className="mt-1 truncate text-sm">{account.user.email}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plan</p>
          <p className="mt-1 text-sm capitalize">{account.subscription?.plan || "free"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Member since</p>
          <p className="mt-1 text-sm">{memberSince ? formatDate(memberSince) : "Today"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link to="/pricing" className="rounded-md border border-border px-3 py-2 hover:border-primary/50">
          Membership plans
        </Link>
        <Link to="/reports" className="rounded-md border border-border px-3 py-2 hover:border-primary/50">
          My reports
        </Link>
        <Link to="/notifications" className="rounded-md border border-border px-3 py-2 hover:border-primary/50">
          Notifications
        </Link>
      </div>
    </div>
  );
}