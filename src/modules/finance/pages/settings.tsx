import React, { useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, Loader2, Plus, WalletCards } from "lucide-react";
import { useCreate, useList } from "@refinedev/core";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

type CashAccount = { id: string; code: string; name: string; unit_id?: string | null; account_type: string; bank_name?: string | null; account_number?: string | null; is_active?: boolean | null };

export const FinanceSettings: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { financeBankName, financeAccountNumber, financeAccountName, financeWaNumber, refreshSettings } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    financeBankName: financeBankName || "",
    financeAccountNumber: financeAccountNumber || "",
    financeAccountName: financeAccountName || "",
    financeWaNumber: financeWaNumber || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [cashForm, setCashForm] = useState({ code: "", name: "", account_type: "bank", bank_name: "", account_number: "", account_holder: "", opening_balance: 0 });
  const { data: cashAccounts } = useList<CashAccount>({ resource: "finance_cash_accounts", pagination: { mode: "off" }, sorters: [{ field: "code", order: "asc" }] });
  const { mutate: createCashAccount, isLoading: creatingCashAccount } = useCreate();

  const handleCreateCashAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUnitId) {
      toast.error("Pilih satu unit sebelum menambahkan kas atau rekening.");
      return;
    }
    createCashAccount({ resource: "finance_cash_accounts", values: { ...cashForm, unit_id: activeUnitId, is_active: true } }, {
      onSuccess: () => {
        toast.success("Kas/rekening berhasil ditambahkan.");
        setCashForm({ code: "", name: "", account_type: "bank", bank_name: "", account_number: "", account_holder: "", opening_balance: 0 });
      },
    });
  };

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
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
      <FinanceSectionNav />
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
              <div><h4 className="font-semibold text-sm flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" /> Daftar Kas & Rekening</h4><p className="mt-1 text-xs text-muted-foreground">Dipakai saat penerimaan, pengeluaran, dan buku kas.</p></div>
              <div className="divide-y rounded-md border">
                {(cashAccounts?.data || []).filter((account) => !activeUnitId || !account.unit_id || account.unit_id === activeUnitId).map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-semibold">{account.code} - {account.name}</p><p className="mt-1 text-xs text-muted-foreground">{account.account_type === "cash" ? "Kas tunai" : `${account.bank_name || account.account_type} · ${account.account_number || "Nomor belum diisi"}`}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${account.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.is_active ? "Aktif" : "Nonaktif"}</span></div>
                ))}
              </div>
              <form onSubmit={handleCreateCashAccount} className="space-y-3 rounded-md bg-muted/30 p-4">
                <p className="text-sm font-semibold">Tambah Kas/Rekening</p>
                <div className="grid gap-3 sm:grid-cols-[120px_1fr]"><input required value={cashForm.code} onChange={(event) => setCashForm({ ...cashForm, code: event.target.value.toUpperCase() })} placeholder="Kode" className="rounded-md border bg-background px-3 py-2 text-sm font-mono" /><input required value={cashForm.name} onChange={(event) => setCashForm({ ...cashForm, name: event.target.value })} placeholder="Nama kas atau rekening" className="rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div className="grid gap-3 sm:grid-cols-2"><select value={cashForm.account_type} onChange={(event) => setCashForm({ ...cashForm, account_type: event.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="cash">Kas Tunai</option><option value="bank">Rekening Bank</option><option value="qris">QRIS</option><option value="virtual_account">Virtual Account</option></select><input type="number" min={0} value={cashForm.opening_balance} onChange={(event) => setCashForm({ ...cashForm, opening_balance: Number(event.target.value) })} placeholder="Saldo awal" className="rounded-md border bg-background px-3 py-2 text-sm" /></div>
                {cashForm.account_type !== "cash" && <div className="grid gap-3 sm:grid-cols-2"><input value={cashForm.bank_name} onChange={(event) => setCashForm({ ...cashForm, bank_name: event.target.value })} placeholder="Nama bank/penyedia" className="rounded-md border bg-background px-3 py-2 text-sm" /><input value={cashForm.account_number} onChange={(event) => setCashForm({ ...cashForm, account_number: event.target.value })} placeholder="Nomor rekening/merchant" className="rounded-md border bg-background px-3 py-2 text-sm" /></div>}
                <div className="flex justify-end"><button disabled={creatingCashAccount} className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Plus className="h-4 w-4" /> Tambahkan</button></div>
              </form>
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
