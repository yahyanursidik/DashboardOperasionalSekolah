import React, { useState, useEffect } from "react";
import { useGetIdentity, useUpdate, useList, useCreate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Users, Bell, Shield, Moon, Sun, Monitor, Palette, Check, Save, Type, Image as ImageIcon, Globe } from "lucide-react";
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
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            Profil Akun
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "users" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Pengguna Sistem
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "appearance" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Sun className="w-4 h-4" />
            Preferensi Tampilan
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "security" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
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
  });

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        full_name: user.profile.full_name || "",
        phone: user.profile.phone || "",
      });
    }
  }, [user]);

  const handleSave = () => {
    if (!user?.profile?.id) return;
    mutate({
      resource: "profiles",
      id: user.profile.id,
      values: formData,
    });
  };

  if (isLoading) return <div className="text-muted-foreground">Memuat profil...</div>;

  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-bold">Profil Publik</h3>
        <p className="text-sm text-muted-foreground">Informasi profil ini akan terlihat oleh anggota lain di dalam unit yang sama.</p>
      </div>

      <div className="space-y-4">
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
  const { data: userRolesData, isLoading } = useList({ 
    resource: "user_roles", 
    meta: { select: "*, profiles(id, full_name, email), roles(id, name), units(id, name)" } 
  });
  const { data: profilesData } = useList({ resource: "profiles" });
  const { data: rolesData } = useList({ resource: "roles" });
  const { data: unitsData } = useList({ resource: "units" });

  const { mutate: createRole } = useCreate();
  const { mutate: deleteRole } = useDelete();

  const [modalMode, setModalMode] = useState<"create" | "create_user" | null>(null);
  const [formData, setFormData] = useState({ user_id: "", role_id: "", unit_id: "" });
  const [newUserFormData, setNewUserFormData] = useState({ email: "", password: "", fullName: "", role_id: "", unit_id: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleSave = () => {
    if (!formData.user_id || !formData.role_id) return;
    createRole({
      resource: "user_roles",
      values: { 
        user_id: formData.user_id, 
        role_id: formData.role_id, 
        unit_id: formData.unit_id || null 
      }
    }, { onSuccess: () => setModalMode(null) });
  };

  const handleRevoke = (id: string) => {
    if (confirm("Cabut hak akses ini?")) {
      deleteRole({ resource: "user_roles", id });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserFormData.email || !newUserFormData.password || !newUserFormData.fullName || !newUserFormData.role_id) return;
    setIsCreatingUser(true);
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
      // Reset form
      setNewUserFormData({ email: "", password: "", fullName: "", role_id: "", unit_id: "" });
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat membuat akun");
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Manajemen Pengguna (RBAC)</h3>
          <p className="text-sm text-muted-foreground">Kelola hak akses dan peran (Role) untuk semua staf dan guru.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setModalMode("create_user")}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
          >
            + Buat Akun Baru
          </button>
          <button 
            onClick={() => setModalMode("create")}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            Tetapkan Hak Akses
          </button>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Nama Pengguna</th>
              <th className="px-6 py-4 whitespace-nowrap">Role (Peran)</th>
              <th className="px-6 py-4 whitespace-nowrap">Unit / Cakupan</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Memuat data akses...</td></tr>
            ) : userRolesData?.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Belum ada hak akses yang ditetapkan.</td></tr>
            ) : (
              userRolesData?.data.map((ur: any) => (
                <tr key={ur.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{ur.profiles?.full_name || 'User Tidak Diketahui'}</div>
                    <div className="text-xs text-muted-foreground">{ur.profiles?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                      {ur.roles?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {ur.units?.name || 'Global (Semua Unit)'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRevoke(ur.id)}
                      className="text-red-600 hover:text-red-700 hover:underline text-xs font-medium"
                    >
                      Cabut Akses
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SettingsModal isOpen={modalMode === "create"} onClose={() => setModalMode(null)} title="Tetapkan Hak Akses (Role)">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Pengguna</label>
            <select 
              value={formData.user_id} 
              onChange={e => setFormData({...formData, user_id: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="" disabled>Pilih staf/guru...</option>
              {profilesData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
            </select>
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
            disabled={!formData.user_id || !formData.role_id}
            className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50"
          >
            Simpan Penetapan Akses
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
            disabled={!newUserFormData.email || !newUserFormData.password || !newUserFormData.fullName || !newUserFormData.role_id || isCreatingUser}
            className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white py-2.5 rounded-md hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {isCreatingUser ? "Sedang Membuat Akun..." : "Buat Akun Sekarang"}
          </button>
        </div>
      </SettingsModal>
    </div>
  );
};
