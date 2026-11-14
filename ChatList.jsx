import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUnreadConversations } from "@/hooks/useUnreadConversations";
import EmptyState from "@/components/EmptyState";
import { MessageSquare, Pin } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";

export default function ChatList() {
  const { user } = useAuth();
  const { conversations, unreadMap, loading } = useUnreadConversations(user?.id);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...conversations].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.last_message_date || b.updated_date || 0) -
      new Date(a.last_message_date || a.updated_date || 0)
    );
  });

  return (
    <div className="px-5 pt-12">
      <h1 className="text-2xl font-bold font-heading mb-5">Messages</h1>
      {sorted.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Start a conversation from a job or applicant."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const otherName = c.homeowner_id === user.id ? c.worker_name : c.homeowner_name;
            const unread = unreadMap[c.id] || 0;
            return (
              <Link
                key={c.id}
                to={`/chat/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 active:scale-[0.98] transition"
              >
                <div className="w-12 h-12 rounded-full bg-brand-blue-light flex items-center justify-center font-semibold text-primary relative flex-shrink-0">
                  {otherName?.[0] || "?"}
                  {c.pinned && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <Pin className="w-2.5 h-2.5 text-accent-foreground" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>
                      {otherName || "Unknown"}
                    </p>
                    {c.last_message_date && (
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {relativeTime(c.last_message_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.job_title}</p>
                  {c.last_message && (
                    <p
                      className={`text-sm truncate mt-0.5 ${
                        unread ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {c.last_message}
                    </p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
