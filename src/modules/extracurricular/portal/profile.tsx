import React, { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "../../../lib/supabase/client";
import { User, Phone, MapPin, School, Mail, Loader2, Save, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const ExtracurricularPortalProfile: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    school_origin: "",
    parent_name: "",
    address: "",
  });

  useEffect(() => {
    if (identity?.id) {
      fetchProfile();
    }
  }, [identity]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('external_students')
        .select('*')
        .eq('user_id', identity.id)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is not found
          console.error("Error fetching profile:", error);
        }
      } else if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          school_origin: data.school_origin || "",
          parent_name: data.parent_name || "",
          address: data.address || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from('external_students')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          school_origin: formData.school_origin,
          parent_name: formData.parent_name,
          address: formData.address,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success("Profil berhasil diperbarui!");
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui profil");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Memuat data profil...</p>
      </div>
    );
  }

  // If not external student, maybe internal student using this portal?
  if (!profile) {
    return (
      <div className="bg-white border rounded-xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Profil Siswa Internal</h2>
        <p className="text-muted-foreground mb-4">
          Anda terdaftar sebagai siswa internal TS Lab School. <br />
          Data profil Anda dikelola oleh sistem akademik utama (Admin).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 sm:p-8 text-primary-foreground shadow-lg flex items-center gap-6">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm shrink-0">
          <User className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-1">{profile.full_name}</h2>
          <p className="text-primary-foreground/80 flex items-center gap-2 text-sm sm:text-base">
            <School className="w-4 h-4" /> {profile.school_origin}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/20">
          <h3 className="font-bold text-lg text-foreground">Detail Informasi Peserta Eksternal</h3>
          <p className="text-sm text-muted-foreground">Perbarui data diri Anda agar informasi tetap akurat di sistem Superadmin.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" /> Nama Lengkap
              </label>
              <input 
                type="text" 
                name="full_name" 
                value={formData.full_name} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email <span className="text-xs text-muted-foreground font-normal">(Tidak bisa diubah)</span>
              </label>
              <input 
                type="email" 
                value={formData.email} 
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-muted text-muted-foreground outline-none cursor-not-allowed" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <School className="w-4 h-4 text-muted-foreground" /> Asal Sekolah
              </label>
              <input 
                type="text" 
                name="school_origin" 
                value={formData.school_origin} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> No. Telepon / WhatsApp
              </label>
              <input 
                type="tel" 
                name="phone_number" 
                value={formData.phone_number} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-muted-foreground" /> Nama Orang Tua / Wali
              </label>
              <input 
                type="text" 
                name="parent_name" 
                value={formData.parent_name} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Alamat Domisili
              </label>
              <textarea 
                name="address" 
                value={formData.address} 
                onChange={handleChange} 
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y" 
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end pt-6 border-t">
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
