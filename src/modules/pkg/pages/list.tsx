import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Plus, Filter, ClipboardCheck, Users, TrendingUp,
  Award, BarChart3, Eye, Edit, Search, Star, Calendar
} from "lucide-react";
import { getPredikatColor, getTahunPelajaranOptions } from "../utils/calculator";

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

  const allRecords = data?.data ?? [];

  // Client-side search by employee name
  const records = useMemo(() => {
    if (!searchQuery) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter((r: any) =>
      r.employees?.full_name?.toLowerCase().includes(q) ||
      r.tahun_pelajaran?.includes(q)
    );
  }, [allRecords, searchQuery]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penilaian Kinerja Guru (PKG)"
        description="Kelola evaluasi kinerja tahunan guru sesuai instrumen Kemendikbud. Skor per kompetensi, nilai akhir, dan predikat kinerja."
        action={
          <Link
            to="/pkg/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Buat PKG Baru
          </Link>
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
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r: any) => (
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
                          {getPredikatIcon(r.predikat)} {r.predikat}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
          </div>
        )}
      </div>
    </div>
  );
};
