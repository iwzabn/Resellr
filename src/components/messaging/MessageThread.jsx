import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

export function MessageThread({ messages, currentUserId, onSend, sending, disabled }) {
  const [body, setBody] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    await onSend(text);
  };

  return (
    <div className="flex flex-col">
      <div className="max-h-[420px] min-h-[180px] space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  message.is_system
                    ? "mx-auto border border-border bg-muted text-center text-xs text-muted-foreground"
                    : mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground"
                }`}
              >
                {!message.is_system && !mine && (
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
                    {message.sender_name}
                  </p>
                )}
                <p className="whitespace-pre-line leading-relaxed">{message.body}</p>
                <p className={`mt-1 font-mono text-[9px] ${mine && !message.is_system ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDateTime(message.created_date)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-border p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          disabled={disabled}
          placeholder="Write a message. Keep addresses and payment details out of chat."
          className="resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">{body.length}/2000</p>
          <Button type="submit" size="sm" disabled={sending || disabled || !body.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send
          </Button>
        </div>
      </form>
    </div>
  );
}