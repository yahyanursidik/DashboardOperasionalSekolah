import React from "react";
import { Package, Truck, ShoppingCart, AlertCircle } from "lucide-react";
import { useList } from "@refinedev/core";

export const SarprasDashboard: React.FC = () => {
  const { data: assets } = useList({ resource: "assets" });
  const { data: loans } = useList({ resource: "asset_loans" });
  const { data: procurements } = useList({ resource: "procurements" });

  const totalAssets = assets?.data?.length || 0;
  const damagedAssets = assets?.data?.filter(a => a.condition !== "Baik").length || 0;
  const activeLoans = loans?.data?.filter(l => l.status === "Menunggu" || l.status === "Disetujui").length || 0;
  const pendingProcurements = procurements?.data?.filter(p => p.status === "Menunggu").length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Sarpras</h1>
          <p className="text-muted-foreground mt-1">Sistem Manajemen Aset & Inventaris Sekolah</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Aset</p>
            <h3 className="text-2xl font-bold">{totalAssets}</h3>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Aset Rusak/Perbaikan</p>
            <h3 className="text-2xl font-bold">{damagedAssets}</h3>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Peminjaman Aktif</p>
            <h3 className="text-2xl font-bold">{activeLoans}</h3>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pengadaan Menunggu</p>
            <h3 className="text-2xl font-bold">{pendingProcurements}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
