import React from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Wallet, Receipt, CreditCard, Clock } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

export const FinanceDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();

  // Fetch invoices for stats
  const { data: invoicesData } = useList({
    resource: "student_invoices",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  // Fetch pending verifications
  const { data: verificationsData } = useList({
    resource: "payment_transactions",
    filters: [{ field: "status", operator: "eq", value: "pending_verification" }],
    pagination: { mode: "off" }
  });

  // Fetch expenses
  const { data: expensesData } = useList({
    resource: "school_expenses",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  const totalInvoices = invoicesData?.data.reduce((acc, curr) => acc + Number(curr.amount) - Number(curr.discount), 0) || 0;
  const totalPaid = invoicesData?.data.reduce((acc, curr) => acc + Number(curr.paid_amount), 0) || 0;
  const totalExpenses = expensesData?.data.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  const pendingCount = verificationsData?.data.length || 0;
  
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Keuangan" description="Ringkasan arus kas dan tagihan berjalan." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Tagihan Aktif</p>
            <h3 className="text-xl font-bold">Rp {totalInvoices.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pemasukan (Lunas)</p>
            <h3 className="text-xl font-bold">Rp {totalPaid.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Menunggu Verifikasi</p>
            <h3 className="text-xl font-bold">{pendingCount} Transaksi</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
            <h3 className="text-xl font-bold">Rp {totalExpenses.toLocaleString('id-ID')}</h3>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">Pantau Tunggakan & Kirim Pengingat</h3>
          <p className="text-indigo-700 text-sm">Masih ada <strong>Rp {(totalInvoices - totalPaid).toLocaleString('id-ID')}</strong> tagihan yang belum dilunasi oleh wali murid. Segera kirimkan pengingat (Reminder) melalui WhatsApp atau Email agar arus kas sekolah tetap lancar.</p>
        </div>
        <button onClick={() => navigate('/finance/invoices')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors whitespace-nowrap">
          Lihat Daftar Tunggakan
        </button>
      </div>
    </div>
  );
};
