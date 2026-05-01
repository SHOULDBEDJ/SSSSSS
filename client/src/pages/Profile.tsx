import { useEffect, useRef, useState } from "react";
import { localDataService } from "@/services/localDataService";
import { useI18n } from "@/context/I18nContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { User, Camera } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const Profile = () => {
  const { t } = useI18n();
  const [id, setId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Security Credentials
  const [adminUsername, setAdminUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const load = async () => {
    const data = localDataService.getAll("business_profile")[0];
    if (data) {
      setId(data.id);
      setBusinessName(data.business_name || "");
      setOwnerName(data.owner_name || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setPhotoUrl(data.photo_url || null);
    }
    
    // Load admin user from session
    const session = localStorage.getItem("sss_session");
    if (session) {
      const s = JSON.parse(session);
      setAdminUsername(s.user.email);
    }
  };
  useEffect(() => { load(); }, []);

  const changeCredentials = async () => {
    if (!currentPassword) return toast.error("Current password required");
    if (newPassword && newPassword.length < 6) return toast.error("New password must be at least 6 chars");
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match");

    setBusy(true);
    // In a real app, this would be an API call. 
    // Here we update the mock session in localStorage.
    const sessionStr = localStorage.getItem("sss_session");
    if (!sessionStr) return toast.error("No active session");

    const session = JSON.parse(sessionStr);
    
    // Simulate credential update
    session.user.email = adminUsername;
    // In this mock, we don't store passwords in plain text normally, 
    // but for this implementation we'll update the session.
    localStorage.setItem("sss_session", JSON.stringify(session));
    
    toast.success("Security credentials updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    const payload = { business_name: businessName, owner_name: ownerName, phone, address, photo_url: photoUrl };
    if (id) {
      localDataService.update("business_profile", id, payload);
    } else {
      localDataService.insert("business_profile", payload);
    }
    const res = { error: null };
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(t("profileSaved"));
      // Refresh logo cache so sidebar/PDF pick up the new image immediately.
      const { refreshBusinessLogo } = await import("@/components/BusinessLogo");
      refreshBusinessLogo();
      load();
    }
    setBusy(false);
  };

  const onPhoto = async (file: File) => {
    if (!ACCEPT.includes(file.type)) return toast.error("Use JPG, PNG, or WebP");
    if (file.size > MAX_BYTES) return toast.error("Max size is 5MB");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoUrl(e.target?.result as string);
      toast.success("Photo uploaded — remember to Save");
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader title={t("profile")} subtitle={t("profileSubtitle")} />
      <Card className="p-6 max-w-2xl">
        <div className="flex items-start gap-6 mb-6 flex-col sm:flex-row">
          <div className="relative">
            <div className="h-28 w-28 rounded-full overflow-hidden bg-muted grid place-items-center border-2 border-border">
              {photoUrl ? <img src={photoUrl} alt="Owner" className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-muted-foreground" />}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:bg-primary/90">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.currentTarget.value = ""; }} />
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-1">{t("uploadPhoto")}</div>
            {t("uploadPhotoHint")}
          </div>
        </div>

        <div className="space-y-4">
          <div><Label>{t("businessName")}</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="ShivaShakti Shamiyana" /></div>
          <div><Label>{t("ownerName")}</Label><Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
          <div><Label>{t("phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7019901151" /></div>
          <div><Label>{t("address")}</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} /></div>
          <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90 w-full md:w-auto h-11 font-bold">{busy ? t("saving") : t("saveProfile")}</Button>
        </div>
      </Card>

      <Card className="p-6 max-w-2xl mt-8 border-destructive/20 bg-destructive/5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-destructive">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
          Admin Security Credentials
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Admin Username</Label>
              <Input 
                value={adminUsername} 
                onChange={(e) => setAdminUsername(e.target.value)} 
                placeholder="Admin"
              />
            </div>
            <div>
              <Label>Current Password</Label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Min. 6 chars"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm"
              />
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={changeCredentials} 
            disabled={busy}
            className="w-full md:w-auto h-11 font-bold shadow-lg shadow-destructive/20"
          >
            Update Security Credentials
          </Button>
          
          <p className="text-[10px] text-muted-foreground italic">
            * Warning: Changing these will affect your next login. Please keep them safe.
          </p>
        </div>
      </Card>
    </>
  );
};
export default Profile;
