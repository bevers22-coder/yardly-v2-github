import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShieldCheck, MapPin } from "lucide-react";
import RatingStars from "@/components/RatingStars";
import { getCategory } from "@/lib/categories";

export default function WorkerProfileSheet({ worker, completedJobs, open, onOpenChange }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (worker && open) {
      base44.entities.Review.filter({ reviewee_id: worker.user_id }, "-created_date", 10).then(setReviews);
    }
  }, [worker, open]);

  if (!worker) return null;
  const responseRate = worker.response_rate ?? 95;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Worker profile</SheetTitle>
        </SheetHeader>
        <div className="mt-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-green-light flex items-center justify-center font-bold text-accent text-2xl flex-shrink-0">
              {worker.avatar_url ? (
                <img src={worker.avatar_url} alt={worker.full_name} className="w-full h-full object-cover" />
              ) : (
                worker.full_name?.[0] || "?"
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold font-heading">{worker.full_name}</h2>
                {worker.verified && <ShieldCheck className="w-5 h-5 text-accent" />}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <RatingStars rating={worker.rating_avg} />
                <span className="text-sm text-muted-foreground">
                  {(worker.rating_avg ?? 5).toFixed(1)} ({worker.rating_count || 0})
                </span>
              </div>
              {worker.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {worker.service_area || worker.city}
                </p>
              )}
              {worker.age_group && (
                <p className="text-xs text-muted-foreground mt-1">
                  Age group: <span className="font-medium text-foreground">{worker.age_group}</span>
                </p>
              )}
            </div>
          </div>

          {worker.age_group && worker.age_group !== "18+" && (
            <div className="rounded-2xl bg-amber-100/70 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              Work eligibility depends on age, location, type of work, and applicable laws. Parent/guardian consent may be required.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-brand-blue-light/60 p-3 text-center">
              <p className="text-xs text-muted-foreground">Jobs done</p>
              <p className="font-bold text-primary">{completedJobs}</p>
            </div>
            <div className="rounded-2xl bg-brand-green-light/60 p-3 text-center">
              <p className="text-xs text-muted-foreground">Response</p>
              <p className="font-bold text-accent">{responseRate}%</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-center">
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="font-bold text-amber-700">${worker.hourly_rate || 0}/hr</p>
            </div>
          </div>

          {worker.bio && (
            <div>
              <h3 className="font-semibold mb-1">About</h3>
              <p className="text-sm text-muted-foreground">{worker.bio}</p>
            </div>
          )}

          {worker.categories?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Services</h3>
              <div className="flex flex-wrap gap-2">
                {worker.categories.map((key) => {
                  const cat = getCategory(key);
                  const Icon = cat.icon;
                  return (
                    <span key={key} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${cat.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {key}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Reviews</h3>
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border/60 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{r.reviewer_name}</span>
                      <RatingStars rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
