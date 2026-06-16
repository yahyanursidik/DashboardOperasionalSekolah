import React, { useState, useEffect, useMemo } from "react";
import { useCreate, useUpdate, useOne, useList, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Save, CheckCircle, Info, ClipboardCheck,
  BookOpen, Heart, Globe, Briefcase, Settings, Loader
} from "lucide-react";
import {
  hitungPKG, getPredikatColor, getTahunPelajaranOptions,
  type ScoreMap,
} from "../utils/calculator";

// ── Score Button ───────────────────────────────────────────────────────────────
const SCORE_LABELS: Record<number, { label: string }> = {
  1: { label: "Kurang"    },
  2: { label: "Cukup"     },
  3: { label: "Baik"      },
  4: { label: "Amat Baik" },
};

function ScoreInput({
  indicatorId,
  label,
  description,
  value,
  onChange,
  index,
}: {
  indicatorId: string;
  label: string;
  description?: string;
  value: number;
  onChange: (id: string, val: number) => void;
  index: number;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-4 border hover:border-primary/30 transition-colors">
      <div className="flex gap-3 mb-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(indicatorId, score)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg border-2 transition-all text-xs font-semibold ${
                isSelected
                  ? score === 4
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400 scale-105"
                    : score === 3
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-offset-1 ring-blue-400 scale-105"
                    : score === 2
                    ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-offset-1 ring-amber-400 scale-105"
                    : "border-red-500 bg-red-50 text-red-700 ring-2 ring-offset-1 ring-red-400 scale-105"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <span className="text-base font-bold">{score}</span>
              <span className="text-[10px]">{SCORE_LABELS[score].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Competency Section (DB-driven) ────────────────────────────────────────────
function CompetencySection({
  competency,
  indicators,
  scores,
  onScoreChange,
}: {
  competency: any;
  indicators: any[];
  scores: ScoreMap;
  onScoreChange: (key: string, id: string, val: number) => void;
}) {
  const ICONS: Record<string, React.ElementType> = {
    pedagogik:   BookOpen,
    kepribadian: Heart,
    sosial:      Globe,
    profesional: Briefcase,
  };
  const Icon = ICONS[competency.key] ?? ClipboardCheck;

  const activeIndicators = indicators
    .filter((i) => i.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  const filled = activeIndicators.filter(i => (scores[i.id] ?? 0) > 0).length;
  const pct = activeIndicators.length > 0 ? Math.round((filled / activeIndicators.length) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{competency.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeIndicators.length} indikator · Bobot {competency.weight}%
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">{filled}/{activeIndicators.length} terisi</p>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {activeIndicators.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Belum ada indikator aktif untuk kompetensi ini.
          </div>
        ) : (
          activeIndicators.map((ind, i) => (
            <ScoreInput
              key={ind.id}
              indicatorId={ind.id}
              label={ind.label}
              description={ind.description}
              value={scores[ind.id] ?? 0}
              onChange={(id, val) => onScoreChange(competency.key, id, val)}
              index={i + 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Live Score Preview ─────────────────────────────────────────────────────────
function LiveScorePreview({
  competencies,
  indicators,
  scoresByKey,
}: {
  competencies: any[];
  indicators: any[];
  scoresByKey: Record<string, ScoreMap>;
}) {
  // Calculate dynamically from DB data
  const compResults = useMemo(() => {
    return competencies.map((comp) => {
      const compInds = indicators.filter(
        (i) => i.competency_id === comp.id && i.is_active !== false
      );
      const maxScore = compInds.length * 4;
      const scores = scoresByKey[comp.key] ?? {};
      let total = 0;
      for (const ind of compInds) {
        total += Number(scores[ind.id] ?? 0);
      }
      const score = maxScore > 0 ? Math.round((total / maxScore) * 100 * 100) / 100 : 0;
      return { key: comp.key, label: comp.label, weight: Number(comp.weight), score };
    });
  }, [competencies, indicators, scoresByKey]);

  const nilaiAkhir = useMemo(() => {
    const totalWeight = compResults.reduce((a, c) => a + c.weight, 0) || 100;
    return Math.round(
      compResults.reduce((a, c) => a + c.score * (c.weight / totalWeight), 0) * 100
    ) / 100;
  }, [compResults]);

  const getPredikat = (v: number) => {
    if (v >= 91) return { label: "Amat Baik", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    if (v >= 76) return { label: "Baik",      color: "bg-blue-100 text-blue-800 border-blue-200" };
    if (v >= 61) return { label: "Cukup",     color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (v >= 51) return { label: "Sedang",    color: "bg-orange-100 text-orange-800 border-orange-200" };
    return              { label: "Kurang",    color: "bg-red-100 text-red-800 border-red-200" };
  };
  const pred = getPredikat(nilaiAkhir);
  const npkg = nilaiAkhir >= 91 ? 125 : nilaiAkhir >= 76 ? 100 : nilaiAkhir >= 61 ? 75 : nilaiAkhir >= 51 ? 50 : 25;

  const COLORS: Record<string, string> = {
    pedagogik: "bg-blue-500", kepribadian: "bg-pink-500",
    sosial: "bg-cyan-500", profesional: "bg-purple-500",
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm sticky top-4">
      <div className="px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Pratinjau Nilai (Live)
        </h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Nilai Akhir */}
        <div className="text-center bg-muted/40 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Nilai PKG</p>
          <p className="text-4xl font-black text-foreground">{nilaiAkhir.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
          {nilaiAkhir > 0 && (
            <span className={`mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full border ${pred.color}`}>
              {pred.label}
            </span>
          )}
        </div>
        {/* Per Kompetensi */}
        <div className="space-y-2.5">
          {compResults.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{c.label.replace("Kompetensi ", "")} ({c.weight}%)</span>
                <span className="font-semibold">{c.score.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${COLORS[c.key] ?? "bg-primary"} transition-all duration-500 rounded-full`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* NPKG */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center bg-muted/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">NPKG</p>
            <p className="text-lg font-bold">{npkg}%</p>
          </div>
          <div className="text-center bg-muted/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">Angka Kredit</p>
            <p className="text-lg font-bold">{npkg}%</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-3">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>Nilai dihitung otomatis berdasarkan bobot yang diatur di Pengaturan Instrumen.</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export const PkgCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const { mutate: create, isLoading: creating } = useCreate();
  const { mutate: update, isLoading: updating } = useUpdate();

  // Load instrument from DB
  const { data: compData, isLoading: loadingComp } = useList({
    resource: "pkg_competencies",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 50 },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });
  const { data: indData, isLoading: loadingInd } = useList({
    resource: "pkg_indicators",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 200 },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });

  const competencies = (compData?.data ?? []) as any[];
  const allIndicators = (indData?.data ?? []) as any[];

  // Load existing data if editing
  const { data: existing } = useOne({
    resource: "pkg_assessments",
    id: id ?? "",
    queryOptions: { enabled: isEdit },
    meta: { select: "*" },
  });

  // Employee & Unit selectors
  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    sorters: [{ field: "full_name", order: "asc" }],
    meta: { select: "id, full_name, position, unit_id" },
    pagination: { pageSize: 500 },
  });
  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  const tahunOptions = getTahunPelajaranOptions();

  // ── Form State ───────────────────────────────────────────────────────────────
  const [employeeId, setEmployeeId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tahunPelajaran, setTahunPelajaran] = useState(tahunOptions[1] ?? "");
  const [periode, setPeriode] = useState("tahunan");
  const [tanggalPenilaian, setTanggalPenilaian] = useState(new Date().toISOString().split("T")[0]);
  const [penilai, setPenilai] = useState("");
  const [jabatanPenilai, setJabatanPenilai] = useState("Kepala Sekolah");
  const [catatan, setCatatan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");

  // Scores: { [competencyKey]: { [indicatorId]: score } }
  const [scoresByKey, setScoresByKey] = useState<Record<string, ScoreMap>>({});

  // Load existing data into form
  useEffect(() => {
    if (existing?.data) {
      const d = existing.data as any;
      setEmployeeId(d.employee_id ?? "");
      setUnitId(d.unit_id ?? "");
      setTahunPelajaran(d.tahun_pelajaran ?? "");
      setPeriode(d.periode ?? "tahunan");
      setTanggalPenilaian(d.tanggal_penilaian ?? "");
      setPenilai(d.penilai ?? "");
      setJabatanPenilai(d.jabatan_penilai ?? "Kepala Sekolah");
      setCatatan(d.catatan ?? "");
      setRekomendasi(d.rekomendasi ?? "");
      // Load existing scores
      const loaded: Record<string, ScoreMap> = {};
      for (const comp of competencies) {
        const field = `${comp.key}_scores`;
        if (d[field]) loaded[comp.key] = d[field];
      }
      setScoresByKey(loaded);
    }
  }, [existing?.data, competencies]);

  const handleScoreChange = (compKey: string, indicatorId: string, value: number) => {
    setScoresByKey((prev) => ({
      ...prev,
      [compKey]: { ...(prev[compKey] ?? {}), [indicatorId]: value },
    }));
  };

  // Compute final result from DB instrument
  const computeResult = () => {
    const compResults = competencies.map((comp) => {
      const compInds = allIndicators.filter(
        (i) => i.competency_id === comp.id && i.is_active !== false
      );
      const maxScore = compInds.length * 4;
      const scores = scoresByKey[comp.key] ?? {};
      let total = 0;
      for (const ind of compInds) total += Number(scores[ind.id] ?? 0);
      const score = maxScore > 0 ? Math.round((total / maxScore) * 100 * 100) / 100 : 0;
      return { key: comp.key, label: comp.label, weight: Number(comp.weight), score };
    });
    const totalWeight = compResults.reduce((a, c) => a + c.weight, 0) || 100;
    const nilaiAkhir = Math.round(
      compResults.reduce((a, c) => a + c.score * (c.weight / totalWeight), 0) * 100
    ) / 100;
    const predikat =
      nilaiAkhir >= 91 ? "Amat Baik"
      : nilaiAkhir >= 76 ? "Baik"
      : nilaiAkhir >= 61 ? "Cukup"
      : nilaiAkhir >= 51 ? "Sedang"
      : "Kurang";
    const npkg = nilaiAkhir >= 91 ? 125 : nilaiAkhir >= 76 ? 100 : nilaiAkhir >= 61 ? 75 : nilaiAkhir >= 51 ? 50 : 25;
    return { nilaiAkhir, predikat, npkg, compResults };
  };

  const handleSubmit = (saveStatus: "draft" | "final") => {
    if (!employeeId) { toast.error("Pilih guru terlebih dahulu."); return; }
    if (!penilai) { toast.error("Nama penilai wajib diisi."); return; }

    const { nilaiAkhir, predikat, npkg, compResults } = computeResult();

    // Build scores payload per competency key
    const scoresPayload: Record<string, any> = {};
    for (const comp of competencies) {
      scoresPayload[`${comp.key}_scores`] = scoresByKey[comp.key] ?? {};
      const cr = compResults.find(r => r.key === comp.key);
      scoresPayload[`skor_${comp.key}`] = cr?.score ?? 0;
    }

    const payload = {
      employee_id: employeeId,
      unit_id: unitId || null,
      tahun_pelajaran: tahunPelajaran,
      periode,
      tanggal_penilaian: tanggalPenilaian,
      penilai,
      jabatan_penilai: jabatanPenilai,
      catatan,
      rekomendasi,
      ...scoresPayload,
      nilai_akhir: nilaiAkhir,
      nilai_npkg: npkg,
      predikat,
      persentase_angka_kredit: npkg,
      status: saveStatus,
    };

    if (isEdit) {
      update(
        { resource: "pkg_assessments", id: id!, values: payload },
        {
          onSuccess: () => { toast.success("PKG berhasil diperbarui!"); navigate("/pkg"); },
          onError: (e) => toast.error(`Gagal: ${e.message}`),
        }
      );
    } else {
      create(
        { resource: "pkg_assessments", values: payload },
        {
          onSuccess: () => {
            toast.success(saveStatus === "final" ? "PKG berhasil difinalisasi!" : "PKG disimpan sebagai draft.");
            navigate("/pkg");
          },
          onError: (e) => toast.error(`Gagal: ${e.message}`),
        }
      );
    }
  };

  // Total indicators
  const totalFilled = useMemo(() => {
    let n = 0;
    for (const comp of competencies) {
      const compInds = allIndicators.filter(i => i.competency_id === comp.id && i.is_active !== false);
      for (const ind of compInds) {
        if ((scoresByKey[comp.key]?.[ind.id] ?? 0) > 0) n++;
      }
    }
    return n;
  }, [scoresByKey, competencies, allIndicators]);

  const totalIndicators = useMemo(
    () => allIndicators.filter(i => i.is_active !== false).length,
    [allIndicators]
  );

  const isSaving = creating || updating;
  const isLoadingInstrument = loadingComp || loadingInd;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Penilaian PKG" : "Buat Penilaian PKG Baru"}
        description="Isi form penilaian kinerja guru. Indikator diambil dari pengaturan instrumen."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-2">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
              {totalFilled}/{totalIndicators} terisi
            </div>
            <button
              onClick={() => navigate("/pkg/settings")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              title="Kelola instrumen PKG"
            >
              <Settings className="w-3.5 h-3.5" />
              Atur Instrumen
            </button>
          </div>
        }
      />

      {/* ── Info Header ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-card rounded-xl border shadow-sm p-5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guru yang Dinilai *</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">— Pilih Guru —</option>
            {employeeOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tahun Pelajaran *</label>
          <select value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30">
            {tahunOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Periode</label>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30">
            <option value="tahunan">Tahunan</option>
            <option value="semester_1">Semester 1</option>
            <option value="semester_2">Semester 2</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tanggal Penilaian *</label>
          <input type="date" value={tanggalPenilaian} onChange={(e) => setTanggalPenilaian(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Penilai *</label>
          <input type="text" value={penilai} onChange={(e) => setPenilai(e.target.value)}
            placeholder="Nama Kepala Sekolah"
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jabatan Penilai</label>
          <input type="text" value={jabatanPenilai} onChange={(e) => setJabatanPenilai(e.target.value)}
            placeholder="Kepala Sekolah"
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</label>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">— Semua Unit —</option>
            {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Loading state ── */}
      {isLoadingInstrument ? (
        <div className="bg-card rounded-xl border shadow-sm p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Memuat instrumen penilaian...</p>
        </div>
      ) : competencies.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Instrumen PKG belum diatur</p>
            <p className="text-sm text-amber-700 mt-1">
              Jalankan SQL migration <code>create_pkg_instrument.sql</code> di Supabase, kemudian atur kompetensi dan indikator melalui halaman{" "}
              <button onClick={() => navigate("/pkg/settings")} className="underline font-semibold">Pengaturan Instrumen</button>.
            </p>
          </div>
        </div>
      ) : (
        /* ── Main Content ── */
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-6">
            {competencies.map((comp) => (
              <CompetencySection
                key={comp.id}
                competency={comp}
                indicators={allIndicators.filter((i) => i.competency_id === comp.id)}
                scores={scoresByKey[comp.key] ?? {}}
                onScoreChange={handleScoreChange}
              />
            ))}

            {/* Catatan */}
            <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm">Catatan & Rekomendasi</h3>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Catatan Penilai</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                  placeholder="Catatan dari penilai..."
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Rekomendasi Pengembangan</label>
                <textarea value={rekomendasi} onChange={(e) => setRekomendasi(e.target.value)} rows={3}
                  placeholder="Rekomendasi pengembangan kompetensi..."
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => handleSubmit("draft")} disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {isSaving ? "Menyimpan..." : "Simpan Draft"}
              </button>
              <button type="button" onClick={() => handleSubmit("final")} disabled={isSaving || totalFilled < totalIndicators}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <CheckCircle className="w-4 h-4" />
                {isSaving ? "Memproses..." : "Finalisasi PKG"}
              </button>
              {totalFilled < totalIndicators && (
                <p className="text-xs text-amber-600">
                  ⚠️ Isi semua {totalIndicators} indikator untuk finalisasi ({totalFilled}/{totalIndicators})
                </p>
              )}
              <button type="button" onClick={() => navigate("/pkg")}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
                Batal
              </button>
            </div>
          </div>

          {/* Live Score */}
          <LiveScorePreview
            competencies={competencies}
            indicators={allIndicators}
            scoresByKey={scoresByKey}
          />
        </div>
      )}
    </div>
  );
};
