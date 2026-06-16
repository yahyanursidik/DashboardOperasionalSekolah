import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Calendar, Award, User, BarChart2, BookOpen, Heart, Globe, Briefcase
} from "lucide-react";
import { getPredikatColor, PKG_COMPETENCIES } from "../utils/calculator";

// ── Trend Line (Pure SVG, no chart library) ───────────────────────────────────
function TrendChart({
  data,
  label,
  color = "#6366f1",
}: {
  data: { year: string; value: number }[];
  label: string;
  color?: string;
}) {
  if (data.length < 2) return null;
  const W = 400, H = 100, PAD = 20;
  const vals = data.map((d) => d.value);
  const min = Math.max(0, Math.min(...vals) - 5);
  const max = Math.min(100, Math.max(...vals) + 5);
  const range = max - min || 1;

  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((d.value - min) / range) * (H - PAD * 2),
    val: d.value,
    year: d.year,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  // Area fill
  const area = `M${pts[0].x},${H - PAD} ` +
    pts.map((p) => `L${p.x},${p.y}`).join(" ") +
    ` L${pts[pts.length - 1].x},${H - PAD} Z`;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${label})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#888">
              {p.year.split("/")[0]}
            </text>
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
              {p.val.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Trend Badge ───────────────────────────────────────────────────────────────
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> Stabil
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
        <TrendingUp className="w-3 h-3" /> +{diff.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
      <TrendingDown className="w-3 h-3" /> {diff.toFixed(1)}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const PkgHistory: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useList({
    resource: "pkg_assessments",
    filters: [{ field: "employee_id", operator: "eq", value: employeeId }],
    sorters: [{ field: "tahun_pelajaran", order: "asc" }],
    pagination: { pageSize: 100 },
    meta: {
      select: "*, employees(full_name, position, nik), units(name)",
    },
  });

  const records = (data?.data ?? []) as any[];

  const employee = records[0]?.employees;

  // Sorted by tahun_pelajaran ascending
  const sorted = useMemo(
    () => [...records].sort((a, b) => a.tahun_pelajaran.localeCompare(b.tahun_pelajaran)),
    [records]
  );

  // Chart data
  const chartNilai = sorted.map((r) => ({
    year: r.tahun_pelajaran,
    value: Number(r.nilai_akhir ?? 0),
  }));

  const COMP_KEYS = [
    { key: "skor_pedagogik",   label: "Pedagogik",   color: "#6366f1", icon: BookOpen },
    { key: "skor_kepribadian", label: "Kepribadian", color: "#ec4899", icon: Heart    },
    { key: "skor_sosial",      label: "Sosial",      color: "#06b6d4", icon: Globe    },
    { key: "skor_profesional", label: "Profesional", color: "#8b5cf6", icon: Briefcase},
  ];

  const compCharts = COMP_KEYS.map((c) => ({
    ...c,
    data: sorted.map((r) => ({ year: r.tahun_pelajaran, value: Number(r[c.key] ?? 0) })),
  }));

  const POSITION_LABEL: Record<string, string> = {
    guru: "Guru", kepala_sekolah: "Kepala Sekolah",
    wakasek: "Wakil Kepala", tu: "Tata Usaha",
  };

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
    } catch { return d; }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat PKG Guru"
        description={
          employee
            ? `Tren penilaian kinerja tahunan: ${employee.full_name}`
            : "Riwayat Penilaian Kinerja Guru"
        }
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/pkg")}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <Link
              to="/pkg/create"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              + Buat PKG Baru
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <div className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat riwayat...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-16 bg-card rounded-xl border shadow-sm flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <BarChart2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">Belum Ada Riwayat PKG</h3>
            <p className="text-muted-foreground text-sm">Belum ada penilaian yang dicatat untuk guru ini.</p>
          </div>
          <Link to="/pkg/create" className="text-primary text-sm hover:underline">Buat PKG Pertama →</Link>
        </div>
      ) : (
        <>
          {/* ── Employee Card ── */}
          {employee && (
            <div className="bg-card rounded-xl border shadow-sm p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-foreground">{employee.full_name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {POSITION_LABEL[employee.position] ?? employee.position}
                  {records[0]?.units?.name && ` · ${records[0].units.name}`}
                </p>
                {employee.nik && <p className="text-xs text-muted-foreground">NIK: {employee.nik}</p>}
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-foreground">{sorted.length}</p>
                <p className="text-xs text-muted-foreground">Total Penilaian</p>
              </div>
            </div>
          )}

          {/* ── Trend Charts ── */}
          {sorted.length >= 2 && (
            <div className="bg-card rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-sm mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Grafik Tren Nilai PKG
              </h3>
              {/* Main chart */}
              <div className="mb-6">
                <TrendChart
                  data={chartNilai}
                  label="Nilai PKG Keseluruhan"
                  color="#6366f1"
                />
              </div>
              {/* Per-competency mini charts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {compCharts.map((c) => (
                  <TrendChart key={c.key} data={c.data} label={c.label} color={c.color} />
                ))}
              </div>
            </div>
          )}

          {/* ── Timeline Table ── */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Riwayat Penilaian Tahun ke Tahun</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-6 py-3">Tahun Pelajaran</th>
                    <th className="px-6 py-3">Tgl Penilaian</th>
                    <th className="px-6 py-3 text-center">Pedagogik</th>
                    <th className="px-6 py-3 text-center">Kepribadian</th>
                    <th className="px-6 py-3 text-center">Sosial</th>
                    <th className="px-6 py-3 text-center">Profesional</th>
                    <th className="px-6 py-3 text-center">Nilai PKG</th>
                    <th className="px-6 py-3 text-center">Predikat</th>
                    <th className="px-6 py-3 text-center">Tren</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((r: any, i: number) => {
                    const prev = sorted[i - 1];
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-semibold">{r.tahun_pelajaran}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">{formatDate(r.tanggal_penilaian)}</td>
                        <td className="px-6 py-4 text-center font-medium">{Number(r.skor_pedagogik ?? 0).toFixed(1)}</td>
                        <td className="px-6 py-4 text-center font-medium">{Number(r.skor_kepribadian ?? 0).toFixed(1)}</td>
                        <td className="px-6 py-4 text-center font-medium">{Number(r.skor_sosial ?? 0).toFixed(1)}</td>
                        <td className="px-6 py-4 text-center font-medium">{Number(r.skor_profesional ?? 0).toFixed(1)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-black text-foreground">
                            {r.nilai_akhir != null ? Number(r.nilai_akhir).toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {r.predikat ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getPredikatColor(r.predikat)}`}>
                              {r.predikat}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {prev && r.nilai_akhir != null && prev.nilai_akhir != null ? (
                            <TrendBadge current={Number(r.nilai_akhir)} previous={Number(prev.nilai_akhir)} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            r.status === "final"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {r.status === "final" ? "Final" : "Draft"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/pkg/show/${r.id}`)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Summary Comparison ── */}
          {sorted.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Best year */}
              {(() => {
                const best = [...sorted].sort((a, b) => Number(b.nilai_akhir ?? 0) - Number(a.nilai_akhir ?? 0))[0];
                return (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 font-semibold">Tahun Terbaik</p>
                      <p className="text-lg font-black text-foreground">{best.tahun_pelajaran}</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        Nilai {Number(best.nilai_akhir).toFixed(1)} · {best.predikat}
                      </p>
                    </div>
                  </div>
                );
              })()}
              {/* Overall average */}
              {(() => {
                const withVal = sorted.filter((r) => r.nilai_akhir != null);
                const avg = withVal.length > 0
                  ? (withVal.reduce((a, r) => a + Number(r.nilai_akhir), 0) / withVal.length).toFixed(1)
                  : "—";
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center shrink-0">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 font-semibold">Rata-rata Keseluruhan</p>
                      <p className="text-lg font-black text-foreground">{avg}</p>
                      <p className="text-sm text-muted-foreground">dari {withVal.length} penilaian</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
};
