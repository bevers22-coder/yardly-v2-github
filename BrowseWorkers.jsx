import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import RatingStars from "@/components/RatingStars";
import EmptyState from "@/components/EmptyState";
import { Search, ShieldCheck, MessageSquare, Users } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/lib/AuthContext";

export default function BrowseWorkers() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.WorkerProfile.list("-rating_avg", 50)
      .then((p) => setProfiles(p))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleMessage = async (profile) => {
    setStarting(profile.id);
    try {
      const existing = await base44.entities.Conversation.filter({
        homeowner_id: user.id,
        worker_id: profile.user_id,
      });
      let conv;
      if (existing.length > 0) {
        conv = existing[0];
      } else {
        conv = await base44.entities.Conversation.create({
          job_id: "general",
          job_title: "General inquiry",
          homeowner_id: user.id,
          worker_id: profile.user_id,
          homeowner_name: user.full_name || "Homeowner",
          worker_name: profile.full_name,
          last_message: "",
        });
      }
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      setStarting(null);
    }
  };

  const filtered = filter === "All" ? profiles : profiles.filter((p) => (p.categories || []).includes(filter));

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-12">
      <h1 className="text-2xl font-bold font-heading mb-1">Find workers</h1>
      <p className="text-sm text-muted-foreground mb-5">Browse verified local professionals.</p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {["All", ...CATEGORIES.map((c) => c.key)].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 h-8 rounded-full text-xs font-medium whitespace-nowrap border transition ${
              filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No workers found" description="Try a different category." />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-card rounded-3xl border border-border/60 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center font-semibold text-accent">
                  {p.full_name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold truncate">{p.full_name}</span>
                    {p.verified && <ShieldCheck className="w-4 h-4 text-accent" />}
                  </div>
                  <RatingStars rating={p.rating_avg} showNumber count={p.rating_count} />
                  {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                </div>
                {p.hourly_rate > 0 && (
                  <div className="text-right">
                    <p className="font-semibold">${p.hourly_rate}</p>
                    <p className="text-xs text-muted-foreground">/hr</p>
                  </div>
                )}
              </div>
              {p.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.bio}</p>}
              {p.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.categories.map((c) => {
                    const cat = CATEGORIES.find((x) => x.key === c);
                    return (
                      <span key={c} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat?.color || "bg-muted text-muted-foreground"}`}>
                        {c}
                      </span>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => handleMessage(p)}
                disabled={starting === p.id}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
