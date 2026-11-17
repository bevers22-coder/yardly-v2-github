import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, MessageSquare, User, Briefcase, Plus, MapPin } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useUnreadConversations } from "@/hooks/useUnreadConversations";

const HOMEOWNER_TABS = [
  { key: "home", label: "Home", icon: Home, path: "/homeowner" },
  { key: "browse", label: "Workers", icon: Search, path: "/browse-workers" },
  { key: "messages", label: "Messages", icon: MessageSquare, path: "/chat" },
  { key: "profile", label: "Profile", icon: User, path: "/profile" },
];

const WORKER_TABS = [
  { key: "nearby", label: "Nearby", icon: MapPin, path: "/nearby-jobs" },
  { key: "jobs", label: "My Jobs", icon: Briefcase, path: "/worker" },
  { key: "messages", label: "Messages", icon: MessageSquare, path: "/chat" },
  { key: "profile", label: "Profile", icon: User, path: "/profile" },
];

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadConversations(user?.id);

  const role = user?.role;
  const tabs = role === "worker" ? WORKER_TABS : HOMEOWNER_TABS;
  const activeTab = tabs.find((t) => location.pathname.startsWith(t.path));
  const isHomeowner = role === "homeowner";

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto pb-28">
        <Outlet />
      </main>

      {isHomeowner && location.pathname === "/homeowner" && (
        <button
          onClick={() => navigate("/post-job")}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition"
          aria-label="Post a job"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/90 backdrop-blur-lg border-t border-border safe-bottom z-30">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab?.key === tab.key;
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon
                    className="w-5 h-5"
                    style={active ? { fill: "currentColor", fillOpacity: 0.15 } : {}}
                  />
                  {tab.key === "messages" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
