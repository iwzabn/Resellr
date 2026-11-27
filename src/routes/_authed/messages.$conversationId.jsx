import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { MessageThread } from "@/components/messaging/MessageThread";
import { getConversationThread, sendMessage } from "@/lib/api/enquiries";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/messages/$conversationId")({
  loader: async ({ params }) => {
    const result = await getConversationThread({ data: { conversation_id: params.conversationId } });
    if (!result) throw notFound();
    return result;
  },
  component: ConversationPage,
  head: () => ({ meta: [{ title: "Conversation — Resellr" }] }),
});

function ConversationPage() {
  const { conversation, messages: initial } = Route.useLoaderData();
  const { user } = useAuth();
  const send = useServerFn(sendMessage);
  const [messages, setMessages] = useState(initial);
  const [sending, setSending] = useState(false);

  const handleSend = async (text) => {
    setSending(true);
    try {
      const result = await send({ data: { conversation_id: conversation.id, body: text } });
      setMessages((current) => [...current, result.message]);
    } catch (err) {
      toast.error(err?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link to="/messages" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> All messages
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">{conversation.listing_title}</h1>
      {conversation.enquiry_id && (
        <Link
          to="/enquiries/$enquiryId"
          params={{ enquiryId: conversation.enquiry_id }}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open the linked enquiry
        </Link>
      )}
      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <MessageThread
          messages={messages}
          currentUserId={user?.id}
          onSend={handleSend}
          sending={sending}
        />
      </section>
    </div>
  );
}