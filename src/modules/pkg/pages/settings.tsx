import React, { useState } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp,
  BookOpen, Heart, Globe, Briefcase, GripVertical,
  ClipboardCheck, Info, AlertCircle, CheckCircle
} from "lucide-react";

// ── Icon map per competency key ───────────────────────────────────────────────
const COMP_ICON: Record<string, React.ElementType> = {
  pedagogik:   BookOpen,
  kepribadian: Heart,
  sosial:      Globe,
  profesional: Briefcase,
};
const COMP_COLOR: Record<string, string> = {
  pedagogik:   "bg-blue-100 text-blue-700 border-blue-200",
  kepribadian: "bg-pink-100 text-pink-700 border-pink-200",
  sosial:      "bg-cyan-100 text-cyan-700 border-cyan-200",
  profesional: "bg-purple-100 text-purple-700 border-purple-200",
};

// ── Indicator Row ─────────────────────────────────────────────────────────────
function IndicatorRow({
  indicator,
  onEdit,
  onDelete,
}: {
  indicator: any;
  onEdit: (ind: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-background rounded-lg border hover:border-primary/30 transition-colors group">
      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
        {indicator.indicator_number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{indicator.label}</p>
        {indicator.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {indicator.description}
          </p>
        )}
        <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
          indicator.is_active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-gray-100 text-gray-500"
        }`}>
          {indicator.is_active ? "Aktif" : "Nonaktif"}
        </span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(indicator)}
          className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit indikator"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(indicator.id)}
          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Hapus indikator"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Indicator Form Modal ──────────────────────────────────────────────────────
function IndicatorModal({
  competencyId,
  existing,
  onClose,
  onSaved,
}: {
  competencyId: string;
  existing: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existing;
  const { mutate: create, isLoading: creating } = useCreate();
  const { mutate: update, isLoading: updating } = useUpdate();

  const [number, setNumber] = useState(existing?.indicator_number ?? "");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [desc, setDesc] = useState(existing?.description ?? "");
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);

  const handleSave = () => {
    if (!label.trim()) { toast.error("Judul indikator wajib diisi."); return; }
    if (!number.trim()) { toast.error("Nomor indikator wajib diisi."); return; }

    const payload = {
      competency_id: competencyId,
      indicator_number: number.trim(),
      label: label.trim(),
      description: desc.trim() || null,
      is_active: isActive,
    };

    if (isEdit) {
      update(
        { resource: "pkg_indicators", id: existing.id, values: payload },
        { onSuccess: () => { toast.success("Indikator berhasil diperbarui!"); onSaved(); }, onError: (e) => toast.error(e.message) }
      );
    } else {
      create(
        { resource: "pkg_indicators", values: payload },
        { onSuccess: () => { toast.success("Indikator berhasil ditambahkan!"); onSaved(); }, onError: (e) => toast.error(e.message) }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl border w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">{isEdit ? "Edit Indikator" : "Tambah Indikator Baru"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">No. Indikator *</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1, 2, 1a..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
              <div className="flex items-center gap-3 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? "left-7" : "left-1"}`} />
                </button>
                <span className="text-sm text-muted-foreground">{isActive ? "Aktif" : "Nonaktif"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Judul Indikator / Pertanyaan *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Menguasai karakteristik peserta didik"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Deskripsi / Penjelasan <span className="text-muted-foreground font-normal normal-case">(opsional)</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Penjelasan detail tentang indikator ini..."
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button
            onClick={handleSave}
            disabled={creating || updating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {creating || updating ? "Menyimpan..." : "Simpan"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Competency Card ───────────────────────────────────────────────────────────
function CompetencyCard({
  competency,
  indicators,
  onRefresh,
}: {
  competency: any;
  indicators: any[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editIndicator, setEditIndicator] = useState<any | null>(null);
  const { mutate: deleteInd } = useDelete();
  const { mutate: updateComp } = useUpdate();

  const Icon = COMP_ICON[competency.key] ?? ClipboardCheck;
  const colorClass = COMP_COLOR[competency.key] ?? "bg-gray-100 text-gray-700 border-gray-200";

  const handleDeleteIndicator = (id: string) => {
    if (!confirm("Hapus indikator ini? Data skor yang sudah masuk tidak akan terpengaruh, tapi indikator ini tidak akan tampil di form baru.")) return;
    deleteInd(
      { resource: "pkg_indicators", id },
      {
        onSuccess: () => { toast.success("Indikator dihapus."); onRefresh(); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleEditIndicator = (ind: any) => {
    setEditIndicator(ind);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditIndicator(null);
  };

  const handleModalSaved = () => {
    handleModalClose();
    onRefresh();
  };

  const activeCount = indicators.filter(i => i.is_active).length;

  return (
    <>
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground">{competency.label}</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${colorClass}`}>
                Bobot {competency.weight}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} indikator aktif · {indicators.length} total
            </p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Indicators list */}
        {open && (
          <div className="px-5 pb-5 space-y-2 border-t pt-4">
            {indicators.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Belum ada indikator.</p>
              </div>
            ) : (
              indicators
                .sort((a, b) => a.sort_order - b.sort_order || a.indicator_number.localeCompare(b.indicator_number))
                .map((ind) => (
                  <IndicatorRow
                    key={ind.id}
                    indicator={ind}
                    onEdit={handleEditIndicator}
                    onDelete={handleDeleteIndicator}
                  />
                ))
            )}

            {/* Add button */}
            <button
              onClick={() => { setEditIndicator(null); setShowModal(true); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/30 rounded-lg text-sm font-medium text-primary hover:border-primary hover:bg-primary/5 transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Indikator Baru
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <IndicatorModal
          competencyId={competency.id}
          existing={editIndicator}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </>
  );
}

// ── Competency Modal ──────────────────────────────────────────────────────────
function CompetencyModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existing;
  const { mutate: create, isLoading: creating } = useCreate();
  const { mutate: update, isLoading: updating } = useUpdate();

  const [key, setKey] = useState(existing?.key ?? "");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [weight, setWeight] = useState<number>(existing?.weight ?? 10);

  const handleSave = () => {
    if (!label.trim()) { toast.error("Nama kompetensi wajib diisi."); return; }
    if (!key.trim()) { toast.error("Key kompetensi wajib diisi."); return; }
    if (weight <= 0 || weight > 100) { toast.error("Bobot harus antara 1–100."); return; }

    const payload = {
      key: key.trim().toLowerCase().replace(/\s+/g, "_"),
      label: label.trim(),
      weight,
    };

    if (isEdit) {
      update(
        { resource: "pkg_competencies", id: existing.id, values: payload },
        { onSuccess: () => { toast.success("Kompetensi diperbarui!"); onSaved(); }, onError: (e) => toast.error(e.message) }
      );
    } else {
      create(
        { resource: "pkg_competencies", values: payload },
        { onSuccess: () => { toast.success("Kompetensi ditambahkan!"); onSaved(); }, onError: (e) => toast.error(e.message) }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl border w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">{isEdit ? "Edit Kompetensi" : "Tambah Kompetensi Baru"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Nama Kompetensi *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Kompetensi Pedagogik"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Key (unik) *</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="pedagogik"
                disabled={isEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Bobot (%) *</label>
              <input
                type="number"
                min={1} max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Total bobot semua kompetensi sebaiknya = 100%
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button
            onClick={handleSave}
            disabled={creating || updating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {creating || updating ? "Menyimpan..." : "Simpan"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const PkgSettings: React.FC = () => {
  const [showCompModal, setShowCompModal] = useState(false);
  const [editComp, setEditComp] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: compData, isLoading: loadingComp, refetch: refetchComp } = useList({
    resource: "pkg_competencies",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 50 },
  });

  const { data: indData, isLoading: loadingInd, refetch: refetchInd } = useList({
    resource: "pkg_indicators",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 200 },
  });

  const competencies = (compData?.data ?? []) as any[];
  const indicators = (indData?.data ?? []) as any[];

  const getIndicatorsForComp = (compId: string) =>
    indicators.filter((i) => i.competency_id === compId);

  const handleRefresh = () => {
    refetchComp();
    refetchInd();
  };

  // Total weight warning
  const totalWeight = competencies.reduce((a, c) => a + Number(c.weight ?? 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan Instrumen PKG"
          description="Kelola kompetensi dan indikator penilaian. Perubahan akan langsung berlaku di form Buat PKG Baru."
          action={
            <button
              onClick={() => { setEditComp(null); setShowCompModal(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Kompetensi
            </button>
          }
        />

        {/* Weight summary */}
        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${
          weightOk
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {weightOk ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <p className="text-sm font-medium">
            Total Bobot Kompetensi: <strong>{totalWeight}%</strong>
            {!weightOk && " — Sebaiknya total bobot = 100% agar kalkulasi nilai akurat."}
          </p>
          <div className="ml-auto flex gap-2 flex-wrap">
            {competencies.map((c) => (
              <span key={c.id} className="text-xs bg-white/70 px-2 py-0.5 rounded border font-medium">
                {c.label.replace("Kompetensi ", "")} {c.weight}%
              </span>
            ))}
          </div>
        </div>

        {/* Competency cards */}
        {loadingComp || loadingInd ? (
          <div className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat instrumen...</p>
          </div>
        ) : competencies.length === 0 ? (
          <div className="p-16 bg-card rounded-xl border shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Belum Ada Instrumen PKG</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Jalankan SQL migration <code className="bg-muted px-1 rounded">create_pkg_instrument.sql</code> di Supabase, atau tambahkan kompetensi secara manual.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {competencies.map((comp) => (
              <CompetencyCard
                key={comp.id}
                competency={comp}
                indicators={getIndicatorsForComp(comp.id)}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}

        {/* Info footer */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Cara kerja</p>
            <p className="text-xs mt-0.5 text-blue-600">
              Setiap perubahan di halaman ini akan langsung tercermin di halaman <strong>Buat PKG Baru</strong>.
              Indikator yang dinonaktifkan tidak akan muncul di form penilaian, tapi data lama tetap tersimpan.
            </p>
          </div>
        </div>
      </div>

      {/* Competency modal */}
      {showCompModal && (
        <CompetencyModal
          existing={editComp}
          onClose={() => { setShowCompModal(false); setEditComp(null); }}
          onSaved={() => { setShowCompModal(false); setEditComp(null); handleRefresh(); }}
        />
      )}
    </>
  );
};
