import React, { useState } from "react";
import { useList, useCreate, type CrudFilters } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Receipt, Plus, Search, Filter, AlertCircle, CheckCircle, Clock, Banknote, CreditCard, Loader2, X } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { belongsToFinanceUnit } from "../finance-utils";
import { toast } from "sonner";

type FinanceCategory = { id: string; name: string; is_recurring?: boolean | null; unit_id?: string | null };
type NamedRecord = { id: string; name: string };
type StudentRecord = { id: string; full_name: string; nis?: string | null };
type CashAccount = { id: string; code: string; name: string; account_type: string; unit_id?: string | null };
type FeeRate = { id: string; name: string; amount: number; category_id: string; program_id?: string | null; unit_id: string; academic_year_id: string; grade_level?: number | null; finance_programs?: { name?: string | null } | null };
type InvoiceRecord = { id: string; student_id?: string | null; external_student_id?: string | null; title: string; amount?: number | null; discount?: number | null; paid_amount?: number | null; status: string; due_date?: string | null; students?: { full_name?: string | null; nis?: string | null } | null; external_students?: { full_name?: string | null; school_origin?: string | null } | null; finance_categories?: FinanceCategory | null };
type InvoiceInsert = { student_id?: string | null; external_student_id?: string | null; category_id: string; program_id?: string | null; fee_rate_id?: string | null; title: string; amount: number; due_date: string; month: string | null; unit_id?: string | null; academic_year_id?: string | null; invoice_number: string; status: string };

export const InvoicesList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({ title: "", category_id: "", program_id: "", fee_rate_id: "", amount: 0, due_date: "", month: "" });
  
  const [targetType, setTargetType] = useState<"all" | "class" | "student" | "ekskul">("all");
  const [ekskulId, setEkskulId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  
  const { data: categoriesData } = useList<FinanceCategory>({ resource: "finance_categories", filters: [{ field: "type", operator: "eq", value: "income" }], pagination: { mode: "off" } });
  const { data: extracurricularsData } = useList<NamedRecord>({ resource: "extracurriculars", pagination: { mode: "off" } });
  const { data: classesData } = useList<NamedRecord>({ resource: "classes", filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [], pagination: { mode: "off" } });
  const studentFilters: CrudFilters = [{ field: "status", operator: "eq", value: "active" }];
  if (activeUnitId) studentFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  const { data: studentsData } = useList<StudentRecord>({
    resource: "students",
    filters: studentFilters,
    pagination: { mode: "off" },
    sorters: [{ field: "full_name", order: "asc" }],
  });
  const { data: cashAccountsData } = useList<CashAccount>({ resource: "finance_cash_accounts", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const { data: feeRatesData } = useList<FeeRate>({ resource: "finance_fee_rates", filters: [{ field: "is_active", operator: "eq", value: true }], meta: { select: "*, finance_programs(name)" }, pagination: { mode: "off" } });
  const categories = (categoriesData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId));
  const cashAccounts = (cashAccountsData?.data || []).filter((item) => belongsToFinanceUnit(item.unit_id, activeUnitId));
  const feeRates = (feeRatesData?.data || []).filter((item) => (!activeUnitId || item.unit_id === activeUnitId) && (!activeYearId || item.academic_year_id === activeYearId));
  
  // Payment / Installment Form
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount_paid: 0, payment_method: "cash", cash_account_id: "", notes: "" });

  const { mutate: createPayment } = useCreate();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnitId || !activeYearId) {
      toast.error("Pilih satu unit dan tahun ajaran sebelum membuat tagihan.");
      return;
    }
    if (!generateForm.title || !generateForm.amount || !generateForm.category_id) {
      toast.error("Lengkapi judul, kategori, dan nominal tagihan.");
      return;
    }
    
    if (targetType === "ekskul" && !ekskulId) {
      toast.error("Pilih program ekstrakurikuler terlebih dahulu.");
      return;
    }
    if (targetType === "class" && !classId) {
      toast.error("Pilih kelas tujuan terlebih dahulu.");
      return;
    }
    if (targetType === "student" && !studentId) {
      toast.error("Pilih siswa terlebih dahulu.");
      return;
    }
    
    setIsGenerating(true);
    try {
      let newInvoices: InvoiceInsert[] = [];
      
      if (targetType !== "ekskul") {
        let query = supabaseClient.from('students').select('id').eq('status', 'active');
        if (activeUnitId) query = query.eq('unit_id', activeUnitId);
        if (targetType === "class") query = query.eq('class_id', classId);
        if (targetType === "student") query = query.eq('id', studentId);
        
        const { data: students, error: studentErr } = await query;
        if (studentErr) throw studentErr;

        if (!students || students.length === 0) {
          toast.error("Tidak ada siswa aktif pada target yang dipilih.");
          setIsGenerating(false);
          return;
        }

        const studentRows = students as unknown as Array<{ id: string }>;
        newInvoices = studentRows.map((s, index) => ({
          student_id: s.id,
          category_id: generateForm.category_id,
          program_id: generateForm.program_id || null,
          fee_rate_id: generateForm.fee_rate_id || null,
          title: generateForm.title,
          amount: generateForm.amount,
          due_date: generateForm.due_date || new Date().toISOString().split('T')[0],
          month: generateForm.month || null,
          unit_id: activeUnitId,
          academic_year_id: activeYearId,
          invoice_number: `INV-${Date.now()}-${String(index + 1).padStart(4, '0')}`,
          status: 'unpaid'
        }));
      } else {
        // Target: Ekskul Members
        const { data: members, error: membersErr } = await supabaseClient
          .from('extracurricular_members')
          .select('student_id, external_student_id')
          .eq('extracurricular_id', ekskulId)
          .eq('status', 'ACTIVE');
          
        if (membersErr) throw membersErr;
        
        if (!members || members.length === 0) {
          toast.error("Tidak ada anggota aktif pada program tersebut.");
          setIsGenerating(false);
          return;
        }
        
        const memberRows = members as unknown as Array<{ student_id?: string | null; external_student_id?: string | null }>;
        newInvoices = memberRows.map((m, index) => ({
          student_id: m.student_id, // Could be null for external
          external_student_id: m.external_student_id, // Could be null for internal
          category_id: generateForm.category_id,
          program_id: generateForm.program_id || null,
          fee_rate_id: generateForm.fee_rate_id || null,
          title: generateForm.title,
          amount: generateForm.amount,
          due_date: generateForm.due_date || new Date().toISOString().split('T')[0],
          month: generateForm.month || null,
          unit_id: activeUnitId,
          academic_year_id: activeYearId,
          invoice_number: `INV-${Date.now()}-${String(index + 1).padStart(4, '0')}`,
          status: 'unpaid'
        }));
      }

      const { error: insertErr } = await supabaseClient.from('student_invoices').insert(newInvoices);
      if (insertErr) throw insertErr;

      toast.success(`Tagihan berhasil dibuat untuk ${newInvoices.length} siswa.`);
      setIsModalOpen(false);
      setGenerateForm({ title: "", category_id: "", program_id: "", fee_rate_id: "", amount: 0, due_date: "", month: "" });
      setTargetType("all");
      setEkskulId("");
      setClassId("");
      setStudentId("");
      refetchInvoices();
    } catch (err: unknown) {
      console.error(err);
      toast.error(`Tagihan gagal dibuat: ${err instanceof Error ? err.message : "kesalahan tidak dikenal"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    const remaining = Number(paymentInvoice.amount) - Number(paymentInvoice.discount || 0) - Number(paymentInvoice.paid_amount || 0);
    if (paymentForm.amount_paid <= 0 || paymentForm.amount_paid > remaining) {
      toast.error("Nominal pembayaran harus lebih dari nol dan tidak boleh melebihi sisa tagihan.");
      return;
    }
    
    createPayment({
      resource: "payment_transactions",
      values: {
        invoice_id: paymentInvoice.id,
        student_id: paymentInvoice.student_id || null,
        external_student_id: paymentInvoice.external_student_id || null,
        amount_paid: paymentForm.amount_paid,
        payment_method: paymentForm.payment_method,
        cash_account_id: paymentForm.cash_account_id || null,
        payment_date: new Date().toISOString().split('T')[0],
        receipt_number: `PAY-${Date.now()}`,
        status: "verified",
        notes: paymentForm.notes
      }
    }, {
      onSuccess: () => {
        setPaymentInvoice(null);
        toast.success('Pembayaran berhasil dicatat dan status tagihan diperbarui.');
      }
    });
  };

  const filters: CrudFilters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading, refetch: refetchInvoices } = useList<InvoiceRecord>({
    resource: "student_invoices",
    filters,
    meta: { select: "*, students(full_name, nis), external_students(full_name, school_origin), finance_categories(name, is_recurring)" },
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" }
  });

  // Filter client-side by search
  const filteredData = data?.data.filter(inv => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const studentName = inv.students?.full_name || inv.external_students?.full_name || "";
    const studentIdStr = inv.students?.nis || inv.external_students?.school_origin || "";
    return studentName.toLowerCase().includes(searchLower) || 
           inv.title.toLowerCase().includes(searchLower) ||
           studentIdStr.toLowerCase().includes(searchLower);
  }) || [];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid': return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Lunas</span>;
      case 'partial': return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Sebagian</span>;
      case 'unpaid': return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Belum Bayar</span>;
      default: return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tagihan & Pembayaran" 
        description="Pantau status pembayaran siswa dan buat tagihan massal (seperti SPP bulanan)." 
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
            <Plus className="w-4 h-4" /> Buat Tagihan
          </button>
        }
      />
      <FinanceSectionNav />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, judul tagihan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="partial">Bayar Sebagian (Cicil)</option>
            <option value="unpaid">Belum Bayar</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat tagihan...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Receipt className="w-12 h-12 mb-4 opacity-20" />
            <p>Tidak ada tagihan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-4 py-4">Judul Tagihan</th>
                  <th className="px-4 py-4">Siswa</th>
                  <th className="px-4 py-4 text-right">Nominal (Rp)</th>
                  <th className="px-4 py-4 text-right">Terbayar</th>
                  <th className="px-4 py-4 text-right">Sisa / Tunggakan</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Jatuh Tempo</th>
                  <th className="px-4 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredData.map(inv => {
                  const netAmount = Number(inv.amount) - Number(inv.discount);
                  const remaining = netAmount - Number(inv.paid_amount);
                  
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-foreground font-bold">{inv.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{inv.finance_categories?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-foreground font-semibold">{inv.students?.full_name || inv.external_students?.full_name}</div>
                          {inv.external_student_id && (
                            <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Eksternal</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {inv.students ? `NIS: ${inv.students.nis || '-'}` : `Asal: ${inv.external_students?.school_origin || '-'}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>{(Number(inv.amount)).toLocaleString('id-ID')}</div>
                        {Number(inv.discount) > 0 && <div className="text-xs text-rose-500 mt-0.5">Diskon: -{(Number(inv.discount)).toLocaleString('id-ID')}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                        {(Number(inv.paid_amount)).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-bold">
                        {remaining > 0 ? remaining.toLocaleString('id-ID') : '0'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">{getStatusBadge(inv.status)}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {remaining > 0 ? (
                            <button 
                              onClick={() => {
                                setPaymentInvoice(inv);
                                const defaultCash = cashAccounts.find((account) => account.account_type === "cash")?.id as string | undefined;
                                setPaymentForm({ amount_paid: remaining, payment_method: "cash", cash_account_id: defaultCash || "", notes: "" });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-bold text-xs transition-colors"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Bayar / Cicil
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5"/> Buat Tagihan Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Tutup"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Tagihan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="targetType" checked={targetType === "all"} onChange={() => setTargetType("all")} className="text-primary focus:ring-primary" />
                      Semua Siswa Aktif
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="targetType" checked={targetType === "class"} onChange={() => setTargetType("class")} className="text-primary focus:ring-primary" />
                      Satu Kelas
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="targetType" checked={targetType === "student"} onChange={() => setTargetType("student")} className="text-primary focus:ring-primary" />
                      Siswa Tertentu
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="targetType" checked={targetType === "ekskul"} onChange={() => setTargetType("ekskul")} className="text-primary focus:ring-primary" />
                      Peserta Ekstrakurikuler
                    </label>
                  </div>
                </div>

                {targetType === "all" && (
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs border border-blue-200 font-medium">
                    Tagihan akan di-generate ke <b>semua siswa aktif</b> di unit yang terpilih saat ini.
                  </div>
                )}

                {targetType === "ekskul" && (
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-xs border border-emerald-200 font-medium mb-3">
                    Tagihan hanya akan di-generate untuk anggota aktif dari ekskul yang dipilih, termasuk <b>siswa eksternal</b>.
                  </div>
                )}

                {targetType === "class" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Kelas Tujuan</label>
                    <select required value={classId} onChange={e => setClassId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">Pilih kelas...</option>
                      {classesData?.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                )}

                {targetType === "student" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Siswa</label>
                    <select required value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">Pilih siswa...</option>
                      {studentsData?.data?.map((item) => <option key={item.id} value={item.id}>{item.full_name} {item.nis ? `(${item.nis})` : ""}</option>)}
                    </select>
                  </div>
                )}

                {targetType === "ekskul" && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="block text-sm font-medium mb-1">Pilih Ekstrakurikuler</label>
                    <select required value={ekskulId} onChange={e => setEkskulId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="">Pilih Ekskul...</option>
                      {extracurricularsData?.data?.map((eks) => (
                        <option key={eks.id} value={eks.id}>{eks.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Master Tarif (Opsional)</label>
                  <select value={generateForm.fee_rate_id} onChange={e => {
                    const feeRate = feeRates.find((item) => item.id === e.target.value);
                    setGenerateForm({ ...generateForm, fee_rate_id: e.target.value, ...(feeRate ? { title: feeRate.name, category_id: feeRate.category_id, program_id: feeRate.program_id || "", amount: Number(feeRate.amount) } : {}) });
                  }} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">Input nominal manual</option>
                    {feeRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.name}{rate.finance_programs?.name ? ` - ${rate.finance_programs.name}` : ""} (Rp {Number(rate.amount).toLocaleString("id-ID")})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori Tagihan</label>
                  <select required value={generateForm.category_id} onChange={e => setGenerateForm({...generateForm, category_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="">Pilih Kategori...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Judul Tagihan</label>
                  <input required type="text" value={generateForm.title} onChange={e => setGenerateForm({...generateForm, title: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Misal: SPP Agustus 2024" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nominal (Rp)</label>
                    <input required type="number" value={generateForm.amount} onChange={e => setGenerateForm({...generateForm, amount: Number(e.target.value)})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Jatuh Tempo</label>
                    <input required type="date" value={generateForm.due_date} onChange={e => setGenerateForm({...generateForm, due_date: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Periode Tagihan (Opsional)</label>
                  <input type="month" value={generateForm.month} onChange={e => setGenerateForm({...generateForm, month: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" disabled={isGenerating} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">Tutup</button>
                <button type="submit" disabled={isGenerating} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>} 
                  {isGenerating ? 'Memproses...' : 'Generate Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment / Installment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-50 text-emerald-900">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5"/> Input Pembayaran</h3>
              <button onClick={() => setPaymentInvoice(null)} className="rounded-md p-1 text-emerald-900/60 hover:bg-emerald-100 hover:text-emerald-900" aria-label="Tutup"><X className="h-4 w-4" /></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tagihan:</span>
                  <span className="font-bold">{paymentInvoice.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Siswa:</span>
                  <span className="font-medium">
                    {paymentInvoice.students?.full_name || paymentInvoice.external_students?.full_name} 
                    {paymentInvoice.external_student_id && ' (Eksternal)'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Total Sisa Tunggakan:</span>
                  <span className="font-bold text-rose-600">Rp {((Number(paymentInvoice.amount) - Number(paymentInvoice.discount || 0)) - Number(paymentInvoice.paid_amount || 0)).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nominal Pembayaran (Rp)</label>
                <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3"/> Ubah nominal jika orang tua mencicil
                </div>
                <input required type="number" min="1" max={(Number(paymentInvoice.amount) - Number(paymentInvoice.discount || 0)) - Number(paymentInvoice.paid_amount || 0)} value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: Number(e.target.value)})} className="w-full border rounded-md px-3 py-2 text-lg font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/30" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Metode Pembayaran</label>
                <select value={paymentForm.payment_method} onChange={e => {
                  const method = e.target.value;
                  const accountType = method === "cash" ? "cash" : method === "qris" ? "qris" : "bank";
                  const defaultAccount = cashAccounts.find((account) => account.account_type === accountType)?.id as string | undefined;
                  setPaymentForm({...paymentForm, payment_method: method, cash_account_id: defaultAccount || paymentForm.cash_account_id});
                }} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="transfer">Transfer Bank (Manual)</option>
                  <option value="qris">QRIS / E-Wallet</option>
                  <option value="virtual_account">Virtual Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Masuk ke Kas/Rekening</label>
                <select required value={paymentForm.cash_account_id} onChange={e => setPaymentForm({...paymentForm, cash_account_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option value="">Pilih kas atau rekening...</option>
                  {cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Keterangan / Catatan</label>
                <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Misal: Titip via Satpam, Cicilan Ke-1..." />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setPaymentInvoice(null)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Konfirmasi Pembayaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
