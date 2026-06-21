import React, { useState } from "react";
import { Package, Truck, ShoppingCart } from "lucide-react";
import { AssetsList } from "./assets";
import { AssetLoansList } from "./asset-loans";
import { ProcurementsList } from "./procurements";

export const UnifiedAssetsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"catalog" | "loans" | "procurements">("catalog");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Master Header */}
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            {activeTab === 'catalog' && <Package className="w-7 h-7" />}
            {activeTab === 'loans' && <Truck className="w-7 h-7" />}
            {activeTab === 'procurements' && <ShoppingCart className="w-7 h-7" />}
          </div>
          Manajemen Aset & Sarpras
        </h1>
        <p className="text-muted-foreground text-sm ml-14">
          Kelola inventaris, persetujuan peminjaman, dan pengajuan pengadaan barang
        </p>
      </div>

      {/* Top Level Tabs */}
      <div className="bg-white rounded-xl border p-1.5 shadow-sm inline-flex mb-4">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "catalog" ? "bg-primary/10 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Package className="w-4 h-4" /> Katalog Aset
        </button>
        <button
          onClick={() => setActiveTab("loans")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "loans" ? "bg-primary/10 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Truck className="w-4 h-4" /> Peminjaman
        </button>
        <button
          onClick={() => setActiveTab("procurements")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "procurements" ? "bg-primary/10 text-primary shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Pengadaan
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === "catalog" && <AssetsList isTabMode={true} />}
        {activeTab === "loans" && <AssetLoansList isTabMode={true} />}
        {activeTab === "procurements" && <ProcurementsList isTabMode={true} />}
      </div>
    </div>
  );
};
