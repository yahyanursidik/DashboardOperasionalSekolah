import React, { useState } from "react";
import { useList, useSelect, type CrudFilter } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

export const TahsinRecordsList: React.FC = () => {
  const [selectedHalaqohId, setSelectedHalaqohId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { options: halaqohOptions } = useSelect({
    resource: "tahfidz_halaqohs",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" }
    ],
    sorters: [{ field: "name", order: "asc" }],
  });

  const filters: CrudFilter[] = [
    { field: "record_type", operator: "eq", value: "tahsin" } // Strictly Tahsin
  ];
  if (selectedHalaqohId) {
    filters.push({ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId });
  }
  if (search) {
    filters.push({ field: "students.full_name", operator: "contains", value: search });
  }

  const { data, isLoading } = useList({
    resource: "quran_records",
    filters,
    sorters: [
      { field: "date", order: "desc" }
    ],
    meta: {
      select: "*, students(full_name), classes(name), employees(full_name), tahfidz_halaqohs(name)"
    }
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jurnal Tilawah & Tahsin"
        description="Pantau mutaba'ah harian tilawah dan tahsin siswa."
      />

      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 gap-2">
          <select
            value={selectedHalaqohId}
            onChange={(e) => setSelectedHalaqohId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Semua Halaqoh Tahsin</option>
            {halaqohOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="relative flex-1 max-w-sm ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
            />
          </div>
        </div>
        <Link
          to="/tahsin-records/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Input Jurnal Tahsin
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Siswa</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas/Halaqoh</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Jilid / Surah</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Halaman / Ayat</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Kelancaran</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Tajwid/Makhroj</th>
                <th className="px-6 py-3 font-semibold text-muted-foreground">Penguji</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada jurnal tahsin.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-medium">{record.students?.full_name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {record.tahfidz_halaqohs ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-200">
                          {record.tahfidz_halaqohs.name}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium border">
                          {record.classes?.name || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{record.surah_or_jilid}</td>
                    <td className="px-6 py-4 font-medium">{record.ayat_or_page}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        record.fluency_score === 'Sangat Lancar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        record.fluency_score === 'Lancar' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        record.fluency_score === 'Kurang Lancar' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {record.fluency_score}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs">
                        {record.tajwid_score && (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">T</span>
                            <span className="font-semibold">{record.tajwid_score}</span>
                          </div>
                        )}
                        {record.makhroj_score && (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">M</span>
                            <span className="font-semibold">{record.makhroj_score}</span>
                          </div>
                        )}
                        {!record.tajwid_score && !record.makhroj_score && <span className="text-muted-foreground italic">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        {record.employees ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {record.employees.full_name.charAt(0)}
                            </div>
                            <span>{record.employees.full_name}</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>
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
