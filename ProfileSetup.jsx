import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Camera, Check, Plus, X, CreditCard, MapPin } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { computeAgeGroup, ELIGIBILITY_NOTICE } from "@/lib/age";
import OnboardingShell from "@/components/OnboardingShell";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

export default function ProfileSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [years, setYears] = useState("");
  const [city, setCity] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  const [dob, setDob] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [parentStatus, setParentStatus] = useState("not_required");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [homeAddress, setHomeAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const fileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setAvatarUrl(file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  const toggleCat = (key) =>
    setSelectedCats((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));

  const handleSubmit = async () => {
    if (!bio.trim()) {
      toast({ title: "Add a short bio", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (user.role === "worker") {
        if (selectedCats.length === 0) {
          toast({ title: "Select at least one service category", variant: "destructive" });
          setSaving(false);
          return;
        }
        if (!dob) {
          toast({ title: "Add your date of birth", description: "We use this only to determine your age group.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const fullName = user.full_name || "Worker";
        const profile = await base44.entities.WorkerProfile.create({
          user_id: user.id,
          full_name: fullName,
          bio,
          avatar_url: avatarUrl,
          categories: selectedCats,
          skills,
          years_experience: Number(years) || 0,
          city,
          service_area: serviceArea,
          age_group: computeAgeGroup(dob),
          parent_guardian_status: parentStatus,
          hourly_rate: Number(hourlyRate) || 0,
          verified: true,
          rating_avg: 5,
          rating_count: 0,
        });
        // Private eligibility data lives on the user record (platform-protected),
        // never on the public WorkerProfile.
        await base44.auth.updateMe({
          worker_profile_id: profile.id,
          avatar_url: avatarUrl,
          bio,
          profile_completed: true,
          date_of_birth: dob,
          parent_guardian_name: parentName,
          parent_guardian_email: parentEmail,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        });
      } else {
        await base44.auth.updateMe({
          avatar_url: avatarUrl,
          bio,
          home_address: homeAddress,
          default_payment_method: paymentMethod || "none",
          profile_completed: true,
        });
      }
      toast({ title: "Profile complete!" });
      window.location.href = "/";
    } catch (err) {
      toast({ title: "Could not save profile", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isWorker = user?.role === "worker";

  return (
    <OnboardingShell
      completed={4}
      icon={Camera}
      iconBg="bg-brand-green-light"
      iconColor="text-accent"
      title="Set up your profile"
      subtitle={isWorker ? "Homeowners will see this when browsing workers." : "Complete your profile to start posting jobs."}
    >
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-muted-foreground" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        <p className="text-sm text-muted-foreground mt-2">{uploading ? "Uploading…" : "Add a profile photo"}</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Short bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={isWorker ? "Tell homeowners about your experience…" : "Tell neighbors a bit about yourself…"}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {isWorker ? (
          <>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {ELIGIBILITY_NOTICE} Your exact birth date stays private — only your age group is shown.
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">Parent/guardian approval does not by itself make a job legally permissible.</p>
            </div>
            {parentStatus !== "not_required" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Parent/guardian name</label>
                  <input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Parent/guardian email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Emergency contact name</label>
                <input
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Emergency contact phone</label>
                <input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Skills</label>
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. Hedge trimming"
                  className="flex-1 h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={addSkill}
                  className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium bg-brand-blue-light text-primary"
                    >
                      {s}
                      <button
                        onClick={() => setSkills(skills.filter((x) => x !== s))}
                        className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Service categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = selectedCats.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      onClick={() => toggleCat(cat.key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition ${
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.key}
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Years of experience</label>
                <input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="5"
                  className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hourly rate ($)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="35"
                  className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin, TX"
                className="w-full h-12 rounded-2xl border border-input bg-background px-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Home address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="123 Maple St, Austin, TX"
                  className="w-full h-12 rounded-2xl border border-input bg-background pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Default payment method</label>
              <button
                onClick={() => setPaymentMethod("visa-demo")}
                className={`w-full h-14 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium ${
                  paymentMethod ? "border-accent bg-brand-green-light/50 text-accent" : "border-border text-muted-foreground"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                {paymentMethod ? "Visa •••• 4242 (demo)" : "Add payment method"}
              </button>
              <p className="text-xs text-muted-foreground mt-1">You'll confirm payment when hiring a worker.</p>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center mt-8"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finish setup"}
      </button>
    </OnboardingShell>
  );
}
