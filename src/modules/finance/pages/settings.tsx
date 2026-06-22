import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, Loader2 } from "lucide-react";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";

export const FinanceSettings: React.FC = () => {
  const { financeBankName, financeAccountNumber, financeAccountName, financeWaNumber, refreshSettings } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    financeBankName: financeBankName || "",
    financeAccountNumber: financeAccountNumber || "",
    financeAccountName: financeAccountName || "",
    financeWaNumber: financeWaNumber || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      financeBankName: financeBankName,
      financeAccountNumber: financeAccountNumber,
      financeAccountName: financeAccountName,
      financeWaNumber: financeWaNumber,
    });
  }, [financeBankName, financeAccountNumber, financeAccountName, financeWaNumber]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: "finance_bank_name", value: formData.financeBankName, description: "Bank Name for Invoices" },
        { key: "finance_account_number", value: formData.financeAccountNumber, description: "Bank Account Number for Invoices" },
        { key: "finance_account_name", value: formData.financeAccountName, description: "Bank Account Name for Invoices" },
        { key: "finance_wa_number", value: formData.financeWaNumber, description: "WhatsApp Number for Payment Confirmations" }
      ];

      for (const update of updates) {
        const { error } = await supabaseClient
          .from("system_settings")
          .upsert(update, { onConflict: 'key' });
        if (error) throw new Error(error.message || "Gagal menyimpan pengaturan");
      }
      
      toast.success("Pengaturan keuangan berhasil disimpan");
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Keuangan"
        description="Kelola informasi rekening bank dan kontak konfirmasi pembayaran."
      />
      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8">
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 className="text-lg font-bold">Keuangan & Pembayaran</h3>
            <p className="text-sm text-muted-foreground">Konfigurasi informasi rekening bank dan kontak konfirmasi WhatsApp yang akan ditampilkan pada Invoice siswa/pendaftar.</p>
          </div>

          <div className="space-y-6">
            <div className="p-5 border rounded-xl bg-card space-y-4">
              <h4 className="font-semibold text-sm border-b pb-2">Informasi Rekening Bank Tujuan</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Bank</label>
                <input 
                  type="text" 
                  value={formData.financeBankName} 
                  onChange={(e) => setFormData({ ...formData, financeBankName: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
                  placeholder="Contoh: BSI (Bank Syariah Indonesia)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nomor Rekening</label>
                  <input 
                    type="text" 
                    value={formData.financeAccountNumber} 
                    onChange={(e) => setFormData({ ...formData, financeAccountNumber: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background font-mono" 
                    placeholder="Contoh: 1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Atas Nama Rekening</label>
                  <input 
                    type="text" 
                    value={formData.financeAccountName} 
                    onChange={(e) => setFormData({ ...formData, financeAccountName: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background" 
                    placeholder="Contoh: Yayasan Pendidikan TSLS"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border rounded-xl bg-card space-y-4">
              <h4 className="font-semibold text-sm border-b pb-2">Kontak Konfirmasi Pembayaran</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor WhatsApp Bendahara/Keuangan</label>
                <input 
                  type="text" 
                  value={formData.financeWaNumber} 
                  onChange={(e) => setFormData({ ...formData, financeWaNumber: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary transition-colors bg-background font-mono" 
                  placeholder="Gunakan format internasional (Contoh: 628111111111)"
                />
                <p className="text-xs text-muted-foreground mt-1">Sistem akan membuat tautan otomatis (wa.me) ke nomor ini saat pendaftar mengeklik tombol Konfirmasi via WhatsApp di Invoice.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan Keuangan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
