import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { computeAgeGroup, ELIGIBILITY_NOTICE } from "@/lib/age";
import { hasEligibilityInfo } from "@/lib/eligibility";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Lets a helper add/update the eligibility info needed to apply for jobs:
// date of birth (private, stored on the user), service area, and
// parent/guardian status. DOB is never shown publicly — only the derived
// age group is stored on the public WorkerProfile.
export default function EligibilityEditor({ user, profile, onSaved }) {
  const [dob, setDob] = useState(user?.date_of_birth || "");
  const [serviceArea, setServiceArea] = useState(profile?.service_area || "");
  const [parentStatus, setParentStatus] = useState(profile?.parent_guardian_status || "not_required");
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  const complete = hasEligibilityInfo({ age_group: dob ? computeAgeGroup(dob) : profile.age_group, service_area: serviceArea || profile.service_area });

  const save = async () => {
    if (!dob) {
      toast({ title: "Add your date of birth", variant: "destructive" });
      return;
    }
    if (!serviceArea.trim()) {
      toast({ title: "Add your service area", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ageGroup = computeAgeGroup(dob);
      await base44.entities.WorkerProfile.update(profile.id, {
        age_group: ageGroup,
        service_area: serviceArea.trim(),
        parent_guardian_status: parentStatus,
      });
      await base44.auth.updateMe({ date_of_birth: dob });
      toast({ title: "Eligibility info saved" });
      onSaved?.({ age_group: ageGroup, service_area: serviceArea.trim(), parent_guardian_status: parentStatus });
    } catch (err) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-5 mb-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" />
        <h2 className="font-semibold">Eligibility info</h2>
      </div>
      {!complete && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-100/70 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Complete this section to apply for jobs. {ELIGIBILITY_NOTICE}</span>
        </div>
      )}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Date of birth</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">Your exact birth date stays private — only your age group is shown.</p>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">General service area</label>
        <input
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          placeholder="e.g. North Austin / 78704"
          className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Parent/guardian involvement</label>
        <select
          value={parentStatus}
          onChange={(e) => setParentStatus(e.target.value)}
          className="w-full h-12 rounded-2xl border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="not_required">Not required (18+)</option>
          <option value="pending">Parent/guardian consent needed</option>
          <option value="linked">Parent/guardian linked</option>
        </select>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save eligibility info"}
      </button>
    </div>
  );
}
