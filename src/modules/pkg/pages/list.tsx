import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Plus, Filter, ClipboardCheck, Users, TrendingUp,
  Award, BarChart3, Eye, Edit, Search, Star, Calendar, Settings, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, UserCheck
} from "lucide-react";
import { getPredikatColor, getTahunPelajaranOptions } from "../utils/calculator";
import {
  getPkgFollowUp,
  getPkgReadiness,
  isPkgEligibleEmployee,
} from "../pkg-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPredikatIcon(predikat: string) {
  switch (predikat) {
    case "Amat Baik": return "🌟";
    case "Baik":      return "✅";
    case "Cukup":     return "🔵";
    case "Sedang":    return "⚠️";
    case "Kurang":    return "🔴";
    default:          return "—";
  }
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── TABLE PAGINATION ──
const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  const actualTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
      <p className="text-sm text-muted-foreground">
        Menampilkan <span className="font-medium text-foreground">{start}-{end}</span> dari <span className="font-medium text-foreground">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium px-2">{currentPage} / {actualTotalPages}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= actualTotalPages}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ── Distribution Bar ──────────────────────────────────────────────────────────
function DistributionBar({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground">Belum ada data</p>;

  const segments = [
    { label: "Amat Baik", key: "Amat Baik", color: "bg-emerald-500" },
    { label: "Baik",      key: "Baik",      color: "bg-blue-500"    },
    { label: "Cukup",     key: "Cukup",     color: "bg-amber-500"   },
    { label: "Sedang",    key: "Sedang",    color: "bg-orange-500"  },
    { label: "Kurang",    key: "Kurang",    color: "bg-red-500"     },
  ].filter(s => (data[s.key] ?? 0) > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all`}
            style={{ width: `${((data[s.key] ?? 0) / total) * 100}%` }}
            title={`${s.label}: ${data[s.key]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
            <span>{s.label}: <strong className="text-foreground">{data[s.key] ?? 0}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const PkgList: React.FC = () => {
  const navigate = useNavigate();
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const tahunOptions = getTahunPelajaranOptions();

  const filters: any[] = [];
  if (filterTahun) filters.push({ field: "tahun_pelajaran", operator: "eq", value: filterTahun });
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "pkg_assessments",
    meta: {
      select: "*, employees(full_name, position, nik), units(name)",
    },
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });

  const { data: employeeData } = useList({
    resource: "employees",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    sorters: [{ field: "full_name", order: "asc" }],
    pagination: { pageSize: 1000 },
    meta: { select: "id, full_name, position, status, unit_id, units(name)" },
  });

  const { data: compData } = useList({
    resource: "pkg_competencies",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 100 },
  });

  const { data: indData } = useList({
    resource: "pkg_indicators",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 300 },
  });

  const allRecords = data?.data ?? [];
  const eligibleEmployees = useMemo(
    () => ((employeeData?.data ?? []) as any[]).filter(isPkgEligibleEmployee),
    [employeeData?.data]
  );
  const instrumentReadiness = useMemo(
    () => getPkgReadiness({
      competencies: (compData?.data ?? []) as any[],
      indicators: (indData?.data ?? []) as any[],
    }),
    [compData?.data, indData?.data]
  );

  // Client-side search by employee name
  const records = useMemo(() => {
    let filtered = allRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = allRecords.filter((r: any) =>
        r.employees?.full_name?.toLowerCase().includes(q) ||
        r.tahun_pelajaran?.includes(q)
      );
    }
    return filtered;
  }, [allRecords, searchQuery]);

  // Client-side Pagination
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return records.slice(start, end);
  }, [records, currentPage, pageSize]);
  
  const totalPages = Math.ceil(records.length / pageSize);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterTahun, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const dist: Record<string, number> = {};
    let totalNilai = 0;
    let withNilai = 0;
    for (const r of allRecords) {
      const p = r.predikat || "—";
      dist[p] = (dist[p] ?? 0) + 1;
      if (r.nilai_akhir) { totalNilai += Number(r.nilai_akhir); withNilai++; }
    }
    return {
      total: allRecords.length,
      final: allRecords.filter((r: any) => r.status === "final").length,
      draft: allRecords.filter((r: any) => r.status === "draft").length,
      rataRata: withNilai > 0 ? (totalNilai / withNilai).toFixed(1) : "—",
      distribution: dist,
    };
  }, [allRecords]);

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
    } catch { return d; }
  };

  const POSITION_LABEL: Record<string, string> = {
    guru: "Guru", kepala_sekolah: "Kepala Sekolah",
    wakasek: "Wakil Kepala", tu: "Tata Usaha",
  };

  const selectedYearRecords = useMemo(
    () => filterTahun
      ? allRecords.filter((r: any) => r.tahun_pelajaran === filterTahun)
      : allRecords,
    [allRecords, filterTahun]
  );

  const qualityStats = useMemo(() => {
    const finalRecords = selectedYearRecords.filter((r: any) => r.status === "final");
    const assessedEmployeeIds = new Set(finalRecords.map((r: any) => r.employee_id));
    const needCoaching = finalRecords.filter((r: any) => Number(r.nilai_akhir ?? 0) < 76).length;
    return {
      eligible: eligibleEmployees.length,
      assessed: assessedEmployeeIds.size,
      unassessed: Math.max(eligibleEmployees.length - assessedEmployeeIds.size, 0),
      coverage: eligibleEmployees.length > 0
        ? Math.round((assessedEmployeeIds.size / eligibleEmployees.length) * 100)
        : 0,
      needCoaching,
    };
  }, [eligibleEmployees.length, selectedYearRecords]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penilaian Kinerja Guru (PKG)"
        description="Kelola evaluasi kinerja tahunan guru sesuai instrumen Kemendikbud. Skor per kompetensi, nilai akhir, dan predikat kinerja."
        action={
          <div className="flex items-center gap-3">
            <Link
              to="/pkg/settings"
              className="flex items-center gap-2 bg-muted text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg hover:bg-muted/80 transition-colors shadow-sm font-medium text-sm border"
            >
              <Settings className="w-4 h-4" /> Pengaturan Instrumen
            </Link>
            <Link
              to="/pkg/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Buat PKG Baru
            </Link>
          </div>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardCheck} label="Total Penilaian"  value={stats.total}     color="bg-blue-100 text-blue-700" />
        <StatCard icon={Award}          label="PKG Final"        value={stats.final}     color="bg-emerald-100 text-emerald-700" sub={`${stats.draft} masih draft`} />
        <StatCard icon={TrendingUp}     label="Rata-rata Nilai"  value={stats.rataRata}  color="bg-purple-100 text-purple-700" />
        <StatCard icon={Users}          label="Guru Ternilai"    value={new Set(allRecords.map((r: any) => r.employee_id)).size} color="bg-amber-100 text-amber-700" />
      </div>

      {/* ── Distribution Chart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-card rounded-xl border shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Cakupan PKG Guru
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {filterTahun ? `Tahun pelajaran ${filterTahun}` : "Semua tahun pelajaran"} berdasarkan guru aktif yang layak dinilai.
              </p>
            </div>
            <span className="text-2xl font-black text-foreground">{qualityStats.coverage}%</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${qualityStats.coverage}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Target Guru</p>
              <p className="text-xl font-bold">{qualityStats.eligible}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Sudah Final</p>
              <p className="text-xl font-bold text-emerald-800">{qualityStats.assessed}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Belum Final</p>
              <p className="text-xl font-bold text-amber-800">{qualityStats.unassessed}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border shadow-sm p-5 ${instrumentReadiness.ready ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            {instrumentReadiness.ready ? (
              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">
                {instrumentReadiness.ready ? "Instrumen Siap Digunakan" : "Instrumen Perlu Dicek"}
              </h3>
              <p className="text-xs mt-1 text-muted-foreground">
                {instrumentReadiness.activeCompetencies} kompetensi aktif, {instrumentReadiness.activeIndicators} indikator aktif, total bobot {instrumentReadiness.totalWeight}%.
              </p>
              {instrumentReadiness.issues.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-amber-800">
                  {instrumentReadiness.issues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
              <Link to="/pkg/settings" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-primary hover:underline">
                <Settings className="w-3.5 h-3.5" /> Kelola instrumen
              </Link>
            </div>
          </div>
        </div>
      </div>

      {allRecords.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Distribusi Predikat Kinerja</h3>
          </div>
          <DistributionBar data={stats.distribution} />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Tahun</option>
            {tahunOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>

          <form
            onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); }}
            className="flex gap-2 ml-auto"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama guru..."
                className="pl-9 pr-3 py-1.5 border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 w-48"
              />
            </div>
            <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Cari
            </button>
            {(filterTahun || filterStatus || searchQuery) && (
              <button
                type="button"
                onClick={() => { setFilterTahun(""); setFilterStatus(""); setSearchQuery(""); setSearchInput(""); }}
                className="text-xs text-red-500 hover:underline font-medium px-2"
              >
                Reset
              </button>
            )}
          </form>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Memuat..." : `${records.length} penilaian ditemukan`}
        </p>
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat data PKG...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Belum Ada Data PKG</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Mulai dengan membuat penilaian kinerja baru untuk guru.
              </p>
            </div>
            <Link
              to="/pkg/create"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="w-4 h-4" /> Buat PKG Pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Tahun Pelajaran</th>
                  <th className="px-6 py-4">Tgl Penilaian</th>
                  <th className="px-6 py-4 text-center">Nilai PKG</th>
                  <th className="px-6 py-4 text-center">Predikat</th>
                  <th className="px-6 py-4">Tindak Lanjut</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRecords.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{r.employees?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {POSITION_LABEL[r.employees?.position] ?? r.employees?.position ?? "—"}
                          {r.units?.name && ` · ${r.units.name}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.tahun_pelajaran}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{r.periode?.replace("_", " ")}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {formatDate(r.tanggal_penilaian)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.nilai_akhir != null ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="text-lg font-bold text-foreground">
                            {Number(r.nilai_akhir).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/ 100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.predikat ? (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getPredikatColor(r.predikat)}`}>
                          {r.predikat}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const followUp = getPkgFollowUp(r.nilai_akhir, r.status);
                        return (
                          <div>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${followUp.color}`}>
                              <Clock className="w-3 h-3" /> {followUp.label}
                            </span>
                            <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">{followUp.description}</p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        r.status === "final"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {r.status === "final" ? "Final" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/pkg/show/${r.id}`)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {r.status === "draft" && (
                          <button
                            onClick={() => navigate(`/pkg/edit/${r.id}`)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit PKG"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/pkg/history/${r.employee_id}`)}
                          className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Lihat Riwayat"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={records.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
