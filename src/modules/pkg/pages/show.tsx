import React, { useMemo } from "react";
import { useOne, useUpdate } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft, CheckCircle, Edit, Printer,
  BookOpen, Heart, Globe, Briefcase, TrendingUp,
  User, Calendar, Award, BarChart2, History
} from "lucide-react";
import {
  PKG_COMPETENCIES,
  getPredikatColor,
  type ScoreMap,
} from "../utils/calculator";

// ── Score label ───────────────────────────────────────────────────────────────
const SCORE_LABELS: Record<number, string> = {
  1: "Kurang", 2: "Cukup", 3: "Baik", 4: "Amat Baik",
};

// ── Competency bar ────────────────────────────────────────────────────────────
function CompetencyBar({
  label, icon: Icon, score, weight, color, indicators, scores,
}: {
  label: string;
  icon: React.ElementType;
  score: number;
  weight: number;
  color: string;
  indicators: { id: string; label: string }[];
  scores: ScoreMap;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground">{label}</h4>
          <p className="text-xs text-muted-foreground">Bobot {weight}%</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-foreground">{score.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">/ 100</p>
        </div>
      </div>
      {/* Progress */}
      <div className="px-5 py-2 border-b bg-muted/20">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all rounded-full"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      {/* Indicators */}
      <div className="p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left pb-2 font-medium">Indikator</th>
              <th className="text-center pb-2 font-medium w-20">Skor</th>
              <th className="text-center pb-2 font-medium w-28">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {indicators.map((ind, i) => {
              const val = Number(scores[ind.id] ?? 0);
              return (
                <tr key={ind.id} className="hover:bg-muted/20">
                  <td className="py-2 pr-3 text-foreground">
                    <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                    {ind.label}
                  </td>
                  <td className="text-center font-bold text-foreground">{val || "—"}</td>
                  <td className="text-center">
                    {val > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        val === 4 ? "bg-emerald-100 text-emerald-700"
                        : val === 3 ? "bg-blue-100 text-blue-700"
                        : val === 2 ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                        {SCORE_LABELS[val]}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Show Component ───────────────────────────────────────────────────────
export const PkgShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutate: update, isLoading: updating } = useUpdate();

  const { data, isLoading } = useOne({
    resource: "pkg_assessments",
    id: id ?? "",
    meta: {
      select: "*, employees(full_name, position, nik, phone), units(name)",
    },
  });

  const record = data?.data as any;

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
      }).format(new Date(d));
    } catch { return d; }
  };

  const POSITION_LABEL: Record<string, string> = {
    guru: "Guru", kepala_sekolah: "Kepala Sekolah",
    wakasek: "Wakil Kepala", tu: "Tata Usaha",
  };

  const handleFinalize = () => {
    if (!confirm("Finalisasi PKG ini? Data tidak dapat diubah setelah final.")) return;
    update(
      { resource: "pkg_assessments", id: id!, values: { status: "final" } },
      {
        onSuccess: () => toast.success("PKG berhasil difinalisasi!"),
        onError: (e) => toast.error(`Gagal: ${e.message}`),
      }
    );
  };

  const COMP_ICONS: Record<string, React.ElementType> = {
    pedagogik: BookOpen, kepribadian: Heart, sosial: Globe, profesional: Briefcase,
  };
  const COMP_COLORS: Record<string, string> = {
    pedagogik:   "bg-blue-100 text-blue-700",
    kepribadian: "bg-pink-100 text-pink-700",
    sosial:      "bg-cyan-100 text-cyan-700",
    profesional: "bg-purple-100 text-purple-700",
  };
  const COMP_SCORE_KEYS: Record<string, string> = {
    pedagogik: "skor_pedagogik", kepribadian: "skor_kepribadian",
    sosial: "skor_sosial", profesional: "skor_profesional",
  };
  const COMP_SCORES_KEYS: Record<string, string> = {
    pedagogik: "pedagogik_scores", kepribadian: "kepribadian_scores",
    sosial: "sosial_scores", profesional: "profesional_scores",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Memuat data PKG...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <p>Data PKG tidak ditemukan.</p>
        <Link to="/pkg" className="text-primary hover:underline text-sm mt-2 inline-block">← Kembali</Link>
      </div>
    );
  }

  const isFinal = record.status === "final";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Penilaian Kinerja Guru"
        description={`PKG ${record.tahun_pelajaran} · ${record.employees?.full_name ?? "—"}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/pkg")}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            {!isFinal && (
              <button
                onClick={() => navigate(`/pkg/edit/${id}`)}
                className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={() => navigate(`/pkg/history/${record.employee_id}`)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <History className="w-4 h-4" /> Riwayat
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
          </div>
        }
      />

      {/* ── Top Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employee info */}
        <div className="bg-card rounded-xl border shadow-sm p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-foreground">{record.employees?.full_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {POSITION_LABEL[record.employees?.position] ?? record.employees?.position ?? "—"}
            </p>
            {record.units?.name && (
              <p className="text-xs text-muted-foreground mt-1">{record.units.name}</p>
            )}
          </div>
        </div>

        {/* Period info */}
        <div className="bg-card rounded-xl border shadow-sm p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-foreground">{record.tahun_pelajaran}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {record.periode?.replace("_", " ") ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tanggal: {formatDate(record.tanggal_penilaian)}
            </p>
            <p className="text-xs text-muted-foreground">
              Penilai: {record.penilai} · {record.jabatan_penilai}
            </p>
          </div>
        </div>

        {/* Final Score Card */}
        <div className={`rounded-xl border shadow-sm p-5 flex flex-col items-center justify-center text-center ${
          isFinal ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" : "bg-card"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFinal ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isFinal ? "✅ Final" : "📝 Draft"}
            </span>
          </div>
          {record.nilai_akhir != null ? (
            <>
              <p className="text-5xl font-black text-foreground">{Number(record.nilai_akhir).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mb-2">Nilai PKG / 100</p>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${getPredikatColor(record.predikat)}`}>
                {record.predikat}
              </span>
              <div className="grid grid-cols-2 gap-3 mt-3 w-full">
                <div className="bg-white/70 rounded-lg p-2 text-center border">
                  <p className="text-[10px] text-muted-foreground">NPKG</p>
                  <p className="font-bold text-sm">{record.nilai_npkg}%</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2 text-center border">
                  <p className="text-[10px] text-muted-foreground">Angka Kredit</p>
                  <p className="font-bold text-sm">{record.persentase_angka_kredit}%</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Nilai belum dihitung</p>
          )}
        </div>
      </div>

      {/* ── Overview chart ── */}
      <div className="bg-card rounded-xl border shadow-sm p-5">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Skor Per Kompetensi
        </h3>
        <div className="space-y-3">
          {PKG_COMPETENCIES.map((comp) => {
            const score = Number(record[COMP_SCORE_KEYS[comp.key]] ?? 0);
            const Icon = COMP_ICONS[comp.key] ?? BookOpen;
            const color = COMP_COLORS[comp.key] ?? "bg-gray-100 text-gray-700";
            return (
              <div key={comp.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{comp.label}</span>
                    <span className="text-muted-foreground font-bold">{score.toFixed(1)} / 100</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground w-12 text-right shrink-0">
                  Bobot {comp.weight}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail Per Kompetensi ── */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
          Detail Skor Per Indikator
        </h3>
        {PKG_COMPETENCIES.map((comp) => (
          <CompetencyBar
            key={comp.key}
            label={comp.label}
            icon={COMP_ICONS[comp.key] ?? BookOpen}
            score={Number(record[COMP_SCORE_KEYS[comp.key]] ?? 0)}
            weight={comp.weight}
            color={COMP_COLORS[comp.key] ?? "bg-gray-100 text-gray-700"}
            indicators={comp.indicators}
            scores={(record[COMP_SCORES_KEYS[comp.key]] ?? {}) as ScoreMap}
          />
        ))}
      </div>

      {/* ── Catatan & Rekomendasi ── */}
      {(record.catatan || record.rekomendasi) && (
        <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
          {record.catatan && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Catatan Penilai</h4>
              <p className="text-sm text-foreground leading-relaxed">{record.catatan}</p>
            </div>
          )}
          {record.rekomendasi && (
            <div className="pt-3 border-t">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Rekomendasi Pengembangan</h4>
              <p className="text-sm text-foreground leading-relaxed">{record.rekomendasi}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Finalize button ── */}
      {!isFinal && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleFinalize}
            disabled={updating}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {updating ? "Memproses..." : "Finalisasi PKG Ini"}
          </button>
        </div>
      )}
    </div>
  );
};
