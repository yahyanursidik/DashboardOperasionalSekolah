import React from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Wallet, Receipt, CreditCard, Clock, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Keuangan</h1>
          <p className="text-emerald-50">Ringkasan arus kas, tagihan berjalan, dan statistik finansial institusi.</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20">
          <p className="text-sm text-emerald-100 mb-1">Kas Bersih (Net Income)</p>
          <div className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-300" />
            Rp {(totalPaid - totalExpenses).toLocaleString('id-ID')}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Receipt className="w-16 h-16 text-blue-600" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Tagihan Aktif</p>
            <h3 className="text-2xl font-bold text-gray-900">Rp {totalInvoices.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-16 h-16 text-emerald-600" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mb-4">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Pemasukan</p>
            <h3 className="text-2xl font-bold text-gray-900">Rp {totalPaid.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <CreditCard className="w-16 h-16 text-rose-600" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 mb-4">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Pengeluaran</p>
            <h3 className="text-2xl font-bold text-gray-900">Rp {totalExpenses.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Clock className="w-16 h-16 text-amber-600" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Menunggu Verifikasi</p>
            <h3 className="text-2xl font-bold text-gray-900">{pendingCount} Transaksi</h3>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <TrendingUp className="w-64 h-64 translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="flex-1 relative z-10">
          <h3 className="text-2xl font-bold text-indigo-950 mb-3">Pantau Tunggakan & Kirim Pengingat</h3>
          <p className="text-indigo-800 text-base leading-relaxed max-w-2xl">
            Masih ada <strong className="text-rose-600 text-lg mx-1">Rp {(totalInvoices - totalPaid).toLocaleString('id-ID')}</strong> 
            tagihan yang belum dilunasi oleh wali murid maupun siswa eksternal. Segera pantau dan kirimkan pengingat melalui 
            sistem untuk menjaga stabilitas kas.
          </p>
        </div>
        <button onClick={() => navigate('/finance/invoices')} className="relative z-10 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 whitespace-nowrap">
          Lihat Daftar Tunggakan
        </button>
      </div>
    </div>
  );
};
