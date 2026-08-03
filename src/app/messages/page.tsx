import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    <section className="container-page grid gap-6 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Chat</p>
        <h1 className="mt-2 text-3xl font-semibold">Messages</h1>
      </div>
      <div className="grid min-h-[420px] place-items-center rounded-lg border bg-white p-6 text-center shadow-soft">
        <div className="max-w-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-secondary">
            <MessageSquare className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-semibold">No active conversation selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Product conversations, RFQ negotiations, read receipts, typing indicators, and
            attachments are handled by the Convex chat functions.
          </p>
        </div>
      </div>
    </section>
  );
}
