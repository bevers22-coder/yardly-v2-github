import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, MessageSquare, UserCheck, CheckCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";

export default function NotificationsSheet({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    base44.entities.Notification.filter({ user_id: userId }, "-created_date", 30).then(setNotifications);
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.user_id === userId) {
        setNotifications((prev) => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [userId]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadOnes = notifications.filter((n) => !n.read);
    if (!unreadOnes.length) return;
    await base44.entities.Notification.bulkUpdate(unreadOnes.map((n) => ({ id: n.id, read: true })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (n) => {
    if (n.read) return;
    base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Bell className="w-5 h-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{unread}</span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between pr-6">
            Notifications
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-medium flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto h-[calc(100vh-100px)]">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground mt-10">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const Icon = n.type === "application" ? UserCheck : MessageSquare;
              return (
                <Link
                  key={n.id}
                  to={n.conversation_id ? `/chat/${n.conversation_id}` : n.job_id && n.job_id !== "general" ? `/job/${n.job_id}` : "/homeowner"}
                  onClick={() => {
                    setOpen(false);
                    markOneRead(n);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl border ${n.read ? "border-border/40 bg-background" : "border-primary/20 bg-brand-blue-light/40"}`}
                >
                  <div className="w-9 h-9 rounded-full bg-brand-blue-light flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    {n.job_title && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.job_title}</p>}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
