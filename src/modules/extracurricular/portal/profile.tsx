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
    birth_place: "",
    birth_date: "",
    parent_name: "",
    parent_phone_number: "",
    address: "",
    medical_notes: "",
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
        const profileData = data as any;
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          email: profileData.email || "",
          phone_number: profileData.phone_number || "",
          school_origin: profileData.school_origin || "",
          birth_place: profileData.birth_place || "",
          birth_date: profileData.birth_date || "",
          parent_name: profileData.parent_name || "",
          parent_phone_number: profileData.parent_phone_number || "",
          address: profileData.address || "",
          medical_notes: profileData.medical_notes || "",
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
      // Create payload dynamically to avoid errors if columns don't exist yet in Supabase
      const payload: any = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        school_origin: formData.school_origin,
        parent_name: formData.parent_name,
        address: formData.address,
      };

      // Only add these if they are filled, or just send them and let supabase throw error if columns missing
      // Since user asked to add them, we assume columns will be created.
      payload.birth_place = formData.birth_place;
      payload.birth_date = formData.birth_date || null;
      payload.parent_phone_number = formData.parent_phone_number;
      payload.medical_notes = formData.medical_notes;

      const { error } = await supabaseClient
        .from('external_students')
        .update(payload)
        .eq('id', profile.id);

      if (error) {
        if (error.message.includes("does not exist")) {
            throw new Error("Terdapat kolom baru yang belum ditambahkan di database Supabase. Hubungi admin/developer.");
        }
        throw error;
      }
      
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
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
          <p className="text-sm text-muted-foreground">Perbarui data diri Anda agar informasi tetap akurat di sistem.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bagian: Data Pribadi Siswa */}
            <div className="md:col-span-2 border-b pb-2 mt-2">
              <h4 className="font-semibold text-primary">Data Pribadi Siswa</h4>
            </div>

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
              <label className="text-sm font-medium">Tempat Lahir</label>
              <input 
                type="text" 
                name="birth_place" 
                value={formData.birth_place} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="Contoh: Jakarta"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Lahir</label>
              <input 
                type="date" 
                name="birth_date" 
                value={formData.birth_date} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> No. Telepon / WhatsApp Anak
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

            {/* Bagian: Data Orang Tua & Darurat */}
            <div className="md:col-span-2 border-b pb-2 mt-6">
              <h4 className="font-semibold text-primary">Data Orang Tua & Darurat</h4>
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> No. HP Orang Tua / Darurat
              </label>
              <input 
                type="tel" 
                name="parent_phone_number" 
                value={formData.parent_phone_number} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="08..."
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
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y" 
              />
            </div>

            <div className="space-y-2 md:col-span-2 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <label className="text-sm font-medium text-rose-800 flex items-center gap-2">
                 Catatan Medis / Riwayat Penyakit (Bila Ada)
              </label>
              <p className="text-xs text-rose-600 mb-2">Penting bagi pelatih/pembina untuk mengetahui kondisi khusus (misal: Asma, Alergi Makanan, dll).</p>
              <textarea 
                name="medical_notes" 
                value={formData.medical_notes} 
                onChange={handleChange} 
                rows={2}
                className="w-full px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 outline-none transition-all resize-y" 
                placeholder="Contoh: Alergi udang, riwayat asma ringan saat kecapean. (Kosongkan jika tidak ada)"
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
