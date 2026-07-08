import React, { useState, useEffect } from "react";
import { useGetIdentity, useUpdate, useList, useCreate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Users, Bell, Shield, Moon, Sun, Monitor, Palette, Check, Save, Type, Image as ImageIcon, Globe, Search, Filter, Trash2, Edit2, SearchX, Loader2, UserPlus, AlertTriangle, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useTheme } from "../../../app/providers/ThemeProvider";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "appearance" | "security">("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Kelola profil akun, pengguna sistem, preferensi tampilan, dan keamanan sistem."
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar Nav */}
        <div className="md:w-64 border-b md:border-b-0 md:border-r bg-muted/10 shrink-0 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all relative overflow-hidden ${
              activeTab === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {activeTab === "profile" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />}
            <User className={`w-4 h-4 ${activeTab === "profile" ? "text-primary" : ""}`} />
            Profil Akun
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all relative overflow-hidden ${
              activeTab === "users" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {activeTab === "users" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />}
            <Users className={`w-4 h-4 ${activeTab === "users" ? "text-primary" : ""}`} />
            Pengguna Sistem
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all relative overflow-hidden ${
              activeTab === "appearance" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {activeTab === "appearance" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />}
            <Sun className={`w-4 h-4 ${activeTab === "appearance" ? "text-primary" : ""}`} />
            Preferensi Tampilan
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all relative overflow-hidden ${
              activeTab === "security" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {activeTab === "security" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />}
            <Shield className={`w-4 h-4 ${activeTab === "security" ? "text-primary" : ""}`} />
            Keamanan & Privasi
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex-1">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
};

// --- SETTINGS SECTIONS ---

const ProfileSettings: React.FC = () => {
  const { data: user, isLoading } = useGetIdentity<any>();
  const { mutate, isLoading: isSaving } = useUpdate();
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        full_name: user.profile.full_name || "",
        phone: user.profile.phone || "",
        avatar_url: user.profile.avatar_url || "",
      });
    }
  }, [user]);

  const handleSave = () => {
    if (!user?.profile?.id) return;
    mutate({
      resource: "profiles",
      id: user.profile.id,
      values: formData,
    }, {
      onSuccess: () => {
        toast.success("Profil berhasil diperbarui");
      }
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 2MB");
        return;
      }

      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user?.profile?.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage
        .from("assets")
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success("Foto profil berhasil diunggah. Jangan lupa klik Simpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah foto profil");
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Memuat profil...</div>;

  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-bold">Profil Publik</h3>
        <p className="text-sm text-muted-foreground">Informasi profil ini akan terlihat oleh anggota lain di dalam unit yang sama.</p>
      </div>

      <div className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex items-center gap-6 p-4 bg-muted/20 border rounded-xl">
          <div className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center bg-background overflow-hidden shrink-0 relative group">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground opacity-30" />
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all cursor-pointer">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="font-medium">Foto Profil</h4>
            <p className="text-xs text-muted-foreground">Upload foto terbaik Anda. Maksimal 2MB.</p>
            {uploadingAvatar && <p className="text-[10px] text-primary animate-pulse font-medium mt-1">Mengunggah...</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email Akun (Tidak bisa diubah)</label>
          <input 
            type="email" 
            value={user?.email || ""} 
            disabled 
            className="w-full border rounded-md px-3 py-2 bg-muted/50 text-muted-foreground outline-none cursor-not-allowed" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nama Lengkap</label>
          <input 
            type="text" 
            value={formData.full_name} 
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
            placeholder="Masukkan nama lengkap"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nomor WhatsApp / HP</label>
          <input 
            type="text" 
            value={formData.phone} 
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
            placeholder="Contoh: 081234567890"
          />
        </div>
      </div>

      <div className="pt-4 border-t">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
};

const AppearanceSettings: React.FC = () => {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { appName, logoUrl, faviconUrl, loginCoverUrl, fontFamily, refreshSettings } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    appName: appName || "TSLS Admin OS",
    logoUrl: logoUrl || "",
    faviconUrl: faviconUrl || "",
    loginCoverUrl: loginCoverUrl || "",
    fontFamily: fontFamily || "Inter",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Sync state if context changes
  useEffect(() => {
    setFormData({
      appName: appName,
      logoUrl: logoUrl,
      faviconUrl: faviconUrl,
      loginCoverUrl: loginCoverUrl,
      fontFamily: fontFamily,
    });
  }, [appName, logoUrl, faviconUrl, loginCoverUrl, fontFamily]);

  const handleSaveIdentity = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: "app_name", value: formData.appName, description: "Global Application Name" },
        { key: "logo_url", value: formData.logoUrl, description: "Global Logo URL" },
        { key: "favicon_url", value: formData.faviconUrl, description: "Global Favicon URL" },
        { key: "login_cover_url", value: formData.loginCoverUrl, description: "Login Background Cover URL" },
        { key: "font_family", value: formData.fontFamily, description: "Global Typography Font Family" }
      ];

      for (const update of updates) {
        const { error } = await supabaseClient
          .from("system_settings")
          .upsert(update, { onConflict: 'key' });
        if (error) {
          console.error(`Error saving ${update.key}:`, error);
          throw new Error(error.message || "Gagal menyimpan pengaturan");
        }
      }
      
      toast.success("Pengaturan tampilan berhasil disimpan");
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    folder: string, 
    setUploadingState: React.Dispatch<React.SetStateAction<boolean>>,
    fieldKey: 'logoUrl' | 'faviconUrl' | 'loginCoverUrl',
    maxSizeMB: number
  ) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Ukuran file maksimal ${maxSizeMB}MB`);
        return;
      }

      setUploadingState(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage
        .from("assets")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [fieldKey]: data.publicUrl }));
      toast.success("File berhasil diunggah. Jangan lupa klik Simpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah file");
    } finally {
      setUploadingState(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Identitas Aplikasi Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">Identitas Aplikasi & Login</h3>
          <p className="text-sm text-muted-foreground">Atur nama aplikasi, logo, favicon, dan gambar latar untuk halaman login.</p>
        </div>
        
        <div className="space-y-6 bg-muted/20 p-5 rounded-xl border">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Aplikasi</label>
            <input 
              type="text" 
              value={formData.appName} 
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
              placeholder="Contoh: TSLS Admin OS"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Logo Aplikasi</label>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-background overflow-hidden shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Palette className="w-6 h-6 text-muted-foreground opacity-30" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logos', setUploadingLogo, 'logoUrl', 2)}
                    disabled={uploadingLogo}
                    className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingLogo && <p className="text-[10px] text-primary animate-pulse">Mengunggah...</p>}
                  <p className="text-[10px] text-muted-foreground">Maks 2MB.</p>
                </div>
              </div>
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Favicon (Ikon Tab Browser)</label>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-background overflow-hidden shrink-0">
                  {formData.faviconUrl ? (
                    <img src={formData.faviconUrl} alt="Favicon" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Globe className="w-6 h-6 text-muted-foreground opacity-30" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input 
                    type="file" 
                    accept="image/png, image/x-icon, image/jpeg, image/svg+xml"
                    onChange={(e) => handleFileUpload(e, 'favicons', setUploadingFavicon, 'faviconUrl', 1)}
                    disabled={uploadingFavicon}
                    className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingFavicon && <p className="text-[10px] text-primary animate-pulse">Mengunggah...</p>}
                  <p className="text-[10px] text-muted-foreground">Rasio 1:1, Maks 1MB.</p>
                </div>
              </div>
            </div>

            {/* Cover Login */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium">Gambar Latar Belakang Login (Cover)</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:w-32 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-background overflow-hidden shrink-0">
                  {formData.loginCoverUrl ? (
                    <img src={formData.loginCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground opacity-30" />
                  )}
                </div>
                <div className="flex-1 space-y-1 w-full">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'covers', setUploadingCover, 'loginCoverUrl', 5)}
                    disabled={uploadingCover}
                    className="w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingCover && <p className="text-[10px] text-primary animate-pulse">Mengunggah...</p>}
                  <p className="text-[10px] text-muted-foreground">Format lanskap disarankan. Maks 5MB.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 mt-2 border-t border-border/50">
            <button 
              onClick={handleSaveIdentity}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium transition-colors text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan Identitas"}
            </button>
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Tipografi Global
          </h3>
          <p className="text-sm text-muted-foreground">Pilih jenis huruf (font) yang akan digunakan di seluruh antarmuka sistem.</p>
        </div>

        <div className="bg-muted/20 p-5 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-2 flex-1 w-full">
            <label className="text-sm font-medium">Jenis Huruf (Font Family)</label>
            <select
              value={formData.fontFamily}
              onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background"
            >
              <option value="Inter">Inter (Sleek & Modern)</option>
              <option value="Roboto">Roboto (Classic & Readable)</option>
              <option value="Outfit">Outfit (Playful & Geometric)</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Clean & Professional)</option>
              <option value="System Default">System Default (Native OS Font)</option>
            </select>
          </div>
          <button 
            onClick={handleSaveIdentity}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium transition-colors text-sm disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4" />
            Terapkan Font
          </button>
        </div>
      </div>

      {/* Warna Sistem Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Warna Sistem
          </h3>
          <p className="text-sm text-muted-foreground">Pilih tema warna utama aplikasi.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <button 
            onClick={() => setColorTheme("islamic")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${colorTheme === "islamic" ? "border-emerald-700 bg-amber-50/50 dark:bg-emerald-950/30" : "border-border hover:border-emerald-600/50 bg-background"}`}
          >
            <div className="w-10 h-10 rounded-full bg-[#31825c] flex items-center justify-center">
              {colorTheme === "islamic" && <Check className="w-5 h-5 text-white" />}
            </div>
            <span className="font-medium text-sm text-center">Nuansa Islami<br/><span className="text-[10px] text-muted-foreground font-normal">(Anti-Lelah)</span></span>
          </button>
          <button 
            onClick={() => setColorTheme("emerald")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${colorTheme === "emerald" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-emerald-500/50 bg-background"}`}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
              {colorTheme === "emerald" && <Check className="w-5 h-5 text-white" />}
            </div>
            <span className="font-medium text-sm">Eye-Care Emerald</span>
          </button>

          <button 
            onClick={() => setColorTheme("ocean")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${colorTheme === "ocean" ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20" : "border-border hover:border-blue-500/50 bg-background"}`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              {colorTheme === "ocean" && <Check className="w-5 h-5 text-white" />}
            </div>
            <span className="font-medium text-sm">Ocean Blue</span>
          </button>

          <button 
            onClick={() => setColorTheme("rose")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${colorTheme === "rose" ? "border-rose-600 bg-rose-50 dark:bg-rose-950/20" : "border-border hover:border-rose-500/50 bg-background"}`}
          >
            <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center">
              {colorTheme === "rose" && <Check className="w-5 h-5 text-white" />}
            </div>
            <span className="font-medium text-sm">Elegant Rose</span>
          </button>

          <button 
            onClick={() => setColorTheme("slate")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${colorTheme === "slate" ? "border-slate-800 bg-slate-100 dark:border-slate-400 dark:bg-slate-800" : "border-border hover:border-slate-500/50 bg-background"}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-400 flex items-center justify-center">
              {colorTheme === "slate" && <Check className="w-5 h-5 text-white dark:text-slate-900" />}
            </div>
            <span className="font-medium text-sm">Classic Slate</span>
          </button>
        </div>
      </div>

      {/* Mode Terang / Gelap Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">Mode Tampilan</h3>
          <p className="text-sm text-muted-foreground">Sesuaikan mode gelap atau terang untuk kenyamanan mata Anda.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}
          >
            <Sun className="w-8 h-8 text-amber-500" />
            <span className="font-medium text-sm">Mode Terang</span>
          </button>

          <button 
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}
          >
            <Moon className="w-8 h-8 text-slate-700 dark:text-slate-200" />
            <span className="font-medium text-sm">Mode Gelap</span>
          </button>

          <button 
            onClick={() => setTheme("system")}
            className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}
          >
            <Monitor className="w-8 h-8 text-slate-500" />
            <span className="font-medium text-sm">Ikuti Sistem</span>
          </button>
        </div>
      </div>

    </div>
  );
};

const SecuritySettings: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Silakan isi kedua kolom kata sandi");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      toast.success("Kata sandi berhasil diperbarui");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui kata sandi");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-bold">Keamanan & Privasi</h3>
        <p className="text-sm text-muted-foreground">Kelola kata sandi dan pengaturan keamanan akun Anda.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/20 border rounded-xl p-5 space-y-4">
          <div className="flex gap-3 items-center pb-4 border-b">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h4 className="font-medium text-foreground">Ganti Kata Sandi</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Sandi baru akan otomatis menggantikan sandi lama Anda.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kata Sandi Baru</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Konfirmasi Kata Sandi Baru</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
                placeholder="Ketik ulang kata sandi baru"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit"
                disabled={isUpdating || !password || !confirmPassword}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 font-medium transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                {isUpdating ? "Memperbarui..." : "Perbarui Kata Sandi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MODAL COMPONENT ---
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <User className="w-5 h-5 opacity-0 absolute" /> {/* Placeholder for X icon if lucide doesn't have it imported, we'll just use text */}
            <span className="font-bold text-xl leading-none">&times;</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const UsersTab: React.FC = () => {
  const { data: userRolesData, isLoading, refetch } = useList({ 
    resource: "user_roles", 
    meta: { select: "*, profiles(id, full_name), roles(id, name), units(id, name)" },
    pagination: { mode: "off" }
  });
  const { data: profilesData } = useList({ resource: "profiles", pagination: { mode: "off" } });
  const { data: rolesData } = useList({ resource: "roles", pagination: { mode: "off" } });
  const { data: unitsData } = useList({ resource: "units", pagination: { mode: "off" } });

  const { mutate: createRole } = useCreate();
  const { mutate: updateRole } = useUpdate();
  const { mutate: deleteRole } = useDelete();

  const [modalMode, setModalMode] = useState<"create" | "create_user" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ user_id: "", role_id: "", unit_id: "" });
  const [newUserFormData, setNewUserFormData] = useState({ email: "", password: "", fullName: "", role_id: "", unit_id: "" });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset ke halaman 1 ketika pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const handleSave = () => {
    if (!formData.user_id || !formData.role_id) return;
    setIsSubmitting(true);
    
    if (modalMode === "edit" && editId) {
      updateRole({
        resource: "user_roles",
        id: editId,
        values: { 
          role_id: formData.role_id, 
          unit_id: formData.unit_id || null 
        }
      }, { 
        onSuccess: () => { 
          toast.success("Hak akses berhasil diperbarui");
          setModalMode(null); 
          setEditId(null); 
        },
        onError: (err) => toast.error(err.message || "Gagal memperbarui hak akses"),
        onSettled: () => setIsSubmitting(false)
      });
    } else {
      createRole({
        resource: "user_roles",
        values: { 
          user_id: formData.user_id, 
          role_id: formData.role_id, 
          unit_id: formData.unit_id || null 
        }
      }, { 
        onSuccess: () => {
          toast.success("Hak akses berhasil ditetapkan");
          setModalMode(null);
        },
        onError: (err) => toast.error(err.message || "Gagal menetapkan hak akses"),
        onSettled: () => setIsSubmitting(false)
      });
    }
  };

  const executeDelete = () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    deleteRole({ resource: "user_roles", id: deleteConfirmId }, {
      onSuccess: () => {
        toast.success("Hak akses berhasil dihapus");
        setDeleteConfirmId(null);
      },
      onError: (err) => toast.error(err.message || "Gagal menghapus hak akses"),
      onSettled: () => setIsSubmitting(false)
    });
  };

  const handleEdit = (ur: any) => {
    setFormData({
      user_id: ur.user_id,
      role_id: ur.role_id,
      unit_id: ur.unit_id || "",
    });
    setEditId(ur.id);
    setModalMode("edit");
  };

  const handleCreateUser = async () => {
    if (!newUserFormData.email || !newUserFormData.password || !newUserFormData.fullName || !newUserFormData.role_id) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserFormData.email,
          password: newUserFormData.password,
          fullName: newUserFormData.fullName,
          roleId: newUserFormData.role_id,
          unitId: newUserFormData.unit_id || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat user");
      }

      toast.success("Akun baru berhasil dibuat!");
      setModalMode(null);
      setNewUserFormData({ email: "", password: "", fullName: "", role_id: "", unit_id: "" });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat membuat akun");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side filtering
  const filteredUsers = React.useMemo(() => {
    if (!userRolesData?.data) return [];
    return userRolesData.data.filter((ur: any) => {
      const searchLower = searchTerm.toLowerCase();
      const name = ur.profiles?.full_name?.toLowerCase() || '';
      const email = ur.profiles?.email?.toLowerCase() || '';
      
      const matchSearch = searchTerm === "" ? true : (name.includes(searchLower) || email.includes(searchLower));
      const matchRole = filterRole ? ur.role_id === filterRole : true;

      return matchSearch && matchRole;
    });
  }, [userRolesData?.data, searchTerm, filterRole]);

  const paginatedUsers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold">Manajemen Pengguna (RBAC)</h3>
          <p className="text-sm text-muted-foreground">Kelola hak akses dan peran (Role) untuk semua staf dan guru.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setModalMode("create_user")}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" /> Buat Akun Baru
          </button>
          <button 
            onClick={() => setModalMode("create")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Shield className="w-4 h-4" /> Tetapkan Akses
          </button>
        </div>
      </div>

      <div className="bg-muted/20 p-4 border rounded-xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari nama atau email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative md:w-64 shrink-0">
          <Filter className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <select 
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="">Semua Peran</option>
            {rolesData?.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Pengguna</th>
                <th className="px-6 py-4 whitespace-nowrap">Peran (Role)</th>
                <th className="px-6 py-4 whitespace-nowrap">Cakupan Unit</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-10 bg-muted/50 rounded animate-pulse w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted/50 rounded-full animate-pulse w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted/50 rounded animate-pulse w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-muted/50 rounded animate-pulse w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                    <SearchX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-foreground">Tidak ada pengguna ditemukan</p>
                    <p className="text-xs mt-1">Coba sesuaikan kata kunci atau filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((ur: any) => {
                  const roleName = ur.roles?.name?.toLowerCase() || '';
                  const roleColors = roleName.includes('admin') ? 'bg-red-100 text-red-800 border-red-200' 
                                   : roleName.includes('principal') ? 'bg-purple-100 text-purple-800 border-purple-200'
                                   : roleName.includes('teacher') ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                   : 'bg-blue-100 text-blue-800 border-blue-200';
                                   
                  return (
                    <tr key={ur.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{ur.profiles?.full_name || 'User Tidak Diketahui'}</div>
                        <div className="text-xs text-muted-foreground">{ur.profiles?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 border rounded-full text-xs font-semibold ${roleColors}`}>
                          {ur.roles?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ur.units?.name ? (
                          <span className="px-2.5 py-1 bg-muted text-muted-foreground border rounded-md text-xs font-medium">
                            {ur.units.name}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-xs font-medium">
                            Global (Semua Unit)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(ur)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                            title="Edit Akses"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(ur.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                            title="Hapus Akses"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-muted/10 border-t px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredUsers.length)} dari {filteredUsers.length} pengguna
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsModal isOpen={modalMode === "create" || modalMode === "edit"} onClose={() => { setModalMode(null); setEditId(null); }} title={modalMode === "edit" ? "Edit Hak Akses" : "Tetapkan Hak Akses (Role)"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Pengguna</label>
            <select 
              value={formData.user_id} 
              onChange={e => setFormData({...formData, user_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              disabled={modalMode === "edit"}
            >
              <option value="" disabled>Pilih staf/guru...</option>
              {profilesData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
            </select>
            {modalMode === "edit" && <p className="text-xs text-muted-foreground">Pengguna tidak dapat diubah saat mengedit hak akses.</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Peran (Role)</label>
            <select 
              value={formData.role_id} 
              onChange={e => setFormData({...formData, role_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="" disabled>Pilih peran...</option>
              {rolesData?.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cakupan Unit (Opsional)</label>
            <select 
              value={formData.unit_id} 
              onChange={e => setFormData({...formData, unit_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">Global (Semua Unit)</option>
              {unitsData?.data?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Kosongkan jika role ini berlaku global untuk seluruh yayasan.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={!formData.user_id || !formData.role_id || isSubmitting}
            className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSubmitting ? "Menyimpan..." : "Simpan Penetapan Akses"}
          </button>
        </div>
      </SettingsModal>

      <SettingsModal isOpen={modalMode === "create_user"} onClose={() => setModalMode(null)} title="Buat Akun Pengguna Baru">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Lengkap</label>
            <input 
              type="text"
              value={newUserFormData.fullName} 
              onChange={e => setNewUserFormData({...newUserFormData, fullName: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="Contoh: Budi Santoso"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email (Untuk Login)</label>
            <input 
              type="email"
              value={newUserFormData.email} 
              onChange={e => setNewUserFormData({...newUserFormData, email: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="budi@contoh.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password Baru</label>
            <input 
              type="text"
              value={newUserFormData.password} 
              onChange={e => setNewUserFormData({...newUserFormData, password: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="Minimal 6 karakter"
            />
            <p className="text-xs text-muted-foreground">Password ini digunakan user untuk login pertama kali.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Peran (Role) Utama</label>
            <select 
              value={newUserFormData.role_id} 
              onChange={e => setNewUserFormData({...newUserFormData, role_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="" disabled>Pilih peran...</option>
              {rolesData?.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cakupan Unit (Opsional)</label>
            <select 
              value={newUserFormData.unit_id} 
              onChange={e => setNewUserFormData({...newUserFormData, unit_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">Global (Semua Unit)</option>
              {unitsData?.data?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleCreateUser} 
            disabled={!newUserFormData.email || !newUserFormData.password || !newUserFormData.fullName || !newUserFormData.role_id || isSubmitting}
            className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white py-2.5 rounded-md hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? "Sedang Membuat Akun..." : "Buat Akun Sekarang"}
          </button>
        </div>
      </SettingsModal>

      <SettingsModal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Konfirmasi Hapus Akses">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Hak Akses Pengguna?</h4>
            <p className="text-sm text-muted-foreground px-4">
              Pengguna ini tidak akan bisa lagi masuk atau mengakses fitur yang terkait dengan *role* ini. Apakah Anda yakin ingin melanjutkan?
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md font-semibold transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              onClick={executeDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </SettingsModal>

    </div>
  );
};
