import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { listConversations } from "@/lib/api/enquiries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/messages/")({
  loader: () => listConversations(),
  component: MessagesPage,
  head: () => ({ meta: [{ title: "Messages — Resellr" }] }),
});

function MessagesPage() {
  const { conversations } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="mono-pill">Internal messaging</p>
      <h1 className="mt-2 text-3xl font-extrabold">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every enquiry opens a thread here. Contact details stay out of chat until you choose to share
        them.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-display text-lg font-bold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send an enquiry or reply to one and it appears here.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to="/messages/$conversationId"
                params={{ conversationId: conversation.id }}
                className="flex items-center gap-3 p-4 transition hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{conversation.listing_title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.last_message || "No messages yet"}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDateTime(conversation.last_message_date || conversation.created_date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}