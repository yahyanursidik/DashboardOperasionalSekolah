import React, { useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const ASPECTS = [
  { id: 'agama_moral', title: 'Nilai Agama & Moral', desc: 'Mengenal agama, ibadah, perilaku jujur, sopan santun.' },
  { id: 'fisik_motorik', title: 'Fisik Motorik', desc: 'Motorik kasar, motorik halus, kesehatan & keselamatan.' },
  { id: 'kognitif', title: 'Kognitif', desc: 'Memecahkan masalah, berpikir logis, mengenal lingkungan.' },
  { id: 'bahasa', title: 'Bahasa', desc: 'Memahami bahasa, mengekspresikan bahasa, keaksaraan.' },
  { id: 'sosial_emosional', title: 'Sosial Emosional', desc: 'Kesadaran diri, rasa tanggung jawab, perilaku prososial.' },
  { id: 'seni', title: 'Seni', desc: 'Mengeksplorasi dan mengekspresikan diri dalam karya seni.' },
];

const SCALES = ['BB', 'MB', 'BSH', 'BSB'];
const SCALE_LABELS: any = {
  'BB': 'Belum Berkembang',
  'MB': 'Mulai Berkembang',
  'BSH': 'Berkembang Sesuai Harapan',
  'BSB': 'Berkembang Sangat Baik'
};

export const StppaAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "paud_stppa_assessments",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  React.useEffect(() => {
    if (record?.class_id && !selectedClassId) {
      // In full implementation, we might join class_id or fetch it via student. 
      // For now, if we don't have it directly on record, we rely on user re-selecting or we just skip disable if it's tricky.
    }
  }, [record, selectedClassId]);

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: studentOptions, queryResult: studentQuery } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedClassId ? [
      { field: "class_id", operator: "eq", value: selectedClassId },
      { field: "status", operator: "eq", value: "active" }
    ] : [],
    queryOptions: { enabled: !!selectedClassId },
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      student_id: formData.get("student_id"),
      date: formData.get("date"),
      period_name: formData.get("period_name"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      growth_weight: formData.get("growth_weight") ? parseFloat(formData.get("growth_weight") as string) : null,
      growth_height: formData.get("growth_height") ? parseFloat(formData.get("growth_height") as string) : null,
      growth_head: formData.get("growth_head") ? parseFloat(formData.get("growth_head") as string) : null,
    };

    ASPECTS.forEach(aspect => {
      data[`${aspect.id}_scale`] = formData.get(`${aspect.id}_scale`);
      data[`${aspect.id}_desc`] = formData.get(`${aspect.id}_desc`);
    });

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/stppa-assessments")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Evaluasi STPPA" : "Input Evaluasi Perkembangan Anak (STPPA)"}
          description="Lengkapi checklist skala pencapaian dan deskripsi narasinya."
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Info Siswa */}
        <div className="bg-card border rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> Informasi Umum</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={isEdit}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">-- Pilih Kelas --</option>
                {classOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Siswa <span className="text-red-500">*</span></label>
              <select
                name="student_id"
                required
                defaultValue={record?.student_id || ""}
                disabled={!selectedClassId && !isEdit}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{selectedClassId ? "-- Pilih Siswa --" : "-- Pilih Kelas Dulu --"}</option>
                {studentOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Periode Evaluasi <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="period_name"
                required
                placeholder="Contoh: Rapor Bulan Juli 2026 atau Akhir Semester"
                defaultValue={record?.period_name}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Tanggal Evaluasi <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="date"
                required
                defaultValue={record ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 6 Aspek Perkembangan */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/20">
            <h3 className="font-bold text-lg">6 Aspek Perkembangan</h3>
            <p className="text-sm text-muted-foreground">Silakan pilih skala dan tulis narasi perkembangan anak.</p>
          </div>
          <div className="divide-y">
            {ASPECTS.map(aspect => (
              <div key={aspect.id} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <h4 className="font-bold text-gray-900 mb-1">{aspect.title}</h4>
                  <p className="text-xs text-muted-foreground mb-4">{aspect.desc}</p>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Skala Capaian</label>
                    <div className="flex flex-col gap-2">
                      {SCALES.map(scale => (
                        <label key={scale} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded transition-colors">
                          <input 
                            type="radio" 
                            name={`${aspect.id}_scale`} 
                            value={scale} 
                            required
                            defaultChecked={record?.[`${aspect.id}_scale`] === scale}
                            className="accent-primary"
                          />
                          <span className="font-medium">{scale}</span> <span className="text-muted-foreground text-xs">({SCALE_LABELS[scale]})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Narasi Deskriptif</label>
                  <textarea
                    name={`${aspect.id}_desc`}
                    required
                    rows={6}
                    defaultValue={record?.[`${aspect.id}_desc`]}
                    className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/50 outline-none"
                    placeholder={`Contoh: Ananda sudah mampu mengenali huruf hijaiyah dan membaca doa harian dengan baik...`}
                  ></textarea>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pertumbuhan */}
        <div className="bg-card border rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-lg mb-1">Catatan Pertumbuhan Anak (Opsional)</h3>
          <p className="text-sm text-muted-foreground mb-4">Diisi untuk laporan akhir semester atau cek kesehatan berkala.</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Berat Badan (kg)</label>
              <input
                type="number"
                step="0.1"
                name="growth_weight"
                defaultValue={record?.growth_weight}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tinggi Badan (cm)</label>
              <input
                type="number"
                step="0.1"
                name="growth_height"
                defaultValue={record?.growth_height}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lingkar Kepala (cm)</label>
              <input
                type="number"
                step="0.1"
                name="growth_head"
                defaultValue={record?.growth_head}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md font-bold text-lg disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {formLoading ? "Menyimpan Rapor..." : "Simpan Penilaian"}
          </button>
        </div>
      </form>
    </div>
  );
};
