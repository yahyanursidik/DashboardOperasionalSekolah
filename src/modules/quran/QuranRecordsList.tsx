import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, BookOpen, Search, Filter, Trash2, Edit } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";

export const QuranRecordsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tahsin" | "tahfidz">("tahfidz");
  
  const { data, isLoading } = useList({
    resource: "quran_records",
    filters: [
      { field: "record_type", operator: "eq", value: activeTab }
    ],
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(full_name, class_id), employees(full_name)"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku Mutaba'ah Al-Qur'an"
        description="Pantau perkembangan capaian Tahsin dan Tahfidz siswa."
      />

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("tahfidz")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "tahfidz" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tahfidz (Hafalan)
        </button>
        <button
          onClick={() => setActiveTab("tahsin")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "tahsin" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tahsin (Bacaan)
        </button>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        <Link
          to="/quran/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Input Nilai Baru
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Materi / Surah</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Ayat / Halaman</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelancaran</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Penguji</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada catatan {activeTab}.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 font-medium">{record.students?.full_name}</td>
                    <td className="px-6 py-4 font-bold text-primary">{record.surah_or_jilid}</td>
                    <td className="px-6 py-4">{record.ayat_or_page}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        record.fluency_score === 'Sangat Lancar' ? 'bg-emerald-100 text-emerald-700' :
                        record.fluency_score === 'Lancar' ? 'bg-blue-100 text-blue-700' :
                        record.fluency_score === 'Kurang Lancar' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.fluency_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{record.employees?.full_name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
