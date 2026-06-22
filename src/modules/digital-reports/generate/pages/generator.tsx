import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "../../../../lib/supabase/client";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { FileBadge, Search, CheckCircle2, AlertCircle, Loader2, Play, Settings } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../../../../lib/audit";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";

export const ReportGenerator: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();

  // Filter States
  const [filterUnit, setFilterUnit] = useState<string>(activeUnitId || "");
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterTemplate, setFilterTemplate] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Reference Data Queries
  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: academicYears } = useList({ resource: "academic_years", pagination: { mode: "off" } });
  const { data: classes, isLoading: isClassesLoading } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    filters: [
      { field: "unit_id", operator: "eq", value: filterUnit },
      { field: "academic_year_id", operator: "eq", value: filterAcademicYear }
    ],
    queryOptions: { enabled: !!filterUnit && !!filterAcademicYear }
  });
  const { data: periods } = useList({
    resource: "report_periods",
    pagination: { mode: "off" },
    filters: [
      { field: "unit_id", operator: "eq", value: filterUnit },
      { field: "academic_year_id", operator: "eq", value: filterAcademicYear },
      { field: "status", operator: "in", value: ["draft", "active"] }
    ],
    queryOptions: { enabled: !!filterUnit && !!filterAcademicYear }
  });
  const { data: templates } = useList({
    resource: "report_templates",
    pagination: { mode: "off" },
    filters: [
      { field: "unit_id", operator: "eq", value: filterUnit },
      { field: "is_active", operator: "eq", value: true }
    ],
    queryOptions: { enabled: !!filterUnit }
  });

  // 2. Fetch Students & Existing Reports when Class & Period are selected
  const { data: students, isLoading: isStudentsLoading, refetch: refetchStudents } = useList({
    resource: "students",
    pagination: { mode: "off" },
    filters: [
      { field: "current_class_id", operator: "eq", value: filterClass },
      { field: "status", operator: "eq", value: "active" }
    ],
    queryOptions: { enabled: !!filterClass }
  });

  const { data: existingReports, isLoading: isReportsLoading, refetch: refetchReports } = useList({
    resource: "student_reports",
    pagination: { mode: "off" },
    filters: [
      { field: "class_id", operator: "eq", value: filterClass },
      { field: "report_period_id", operator: "eq", value: filterPeriod },
      { field: "status", operator: "ne", value: "archived" }
    ],
    queryOptions: { enabled: !!filterClass && !!filterPeriod }
  });

  // 3. Process Data for Preview
  const previewData = useMemo(() => {
    if (!students?.data) return [];
    const reportsMap = new Map((existingReports?.data || []).map(r => [r.student_id, r]));
    
    return students.data.map(student => {
      const existingReport = reportsMap.get(student.id);
      return {
        ...student,
        hasDraft: !!existingReport,
        reportId: existingReport?.id,
        reportStatus: existingReport?.status
      };
    }).sort((a, b) => ((a as any).full_name || "").localeCompare((b as any).full_name || ""));
  }, [students?.data, existingReports?.data]);

  const readyToGenerateCount = previewData.filter(s => !s.hasDraft).length;
  const alreadyGeneratedCount = previewData.filter(s => s.hasDraft).length;

  const isFormValid = filterUnit && filterClass && filterPeriod && filterTemplate;
  const isLoadingPreview = isStudentsLoading || isReportsLoading;

  // 4. Generate Action
  const handleGenerate = async () => {
    if (!isFormValid || readyToGenerateCount === 0 || !user?.id) return;
    
    setIsGenerating(true);
    try {
      const studentsToGenerate = previewData.filter(s => !s.hasDraft);
      const payload = studentsToGenerate.map(s => ({
        student_id: s.id,
        class_id: filterClass,
        report_period_id: filterPeriod,
        template_id: filterTemplate,
        status: "draft",
        created_by: user.id,
        updated_by: user.id
      }));

      const { error: insertError } = await supabaseClient
        .from('student_reports')
        .insert(payload);

      if (insertError) throw insertError;

      const selectedClass = classes?.data?.find(c => c.id === filterClass);
      
      // Log audit
      await logAudit(
        user.id,
        'create',
        'student_reports_batch',
        filterClass,
        null,
        { count: payload.length, class_name: selectedClass?.name, report_period_id: filterPeriod }
      );

      toast.success(`Berhasil membuat ${payload.length} draft rapor untuk kelas ${selectedClass?.name || ''}`);
      refetchReports(); // Refresh the list
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal melakukan generate: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Generate Draft Rapor"
        description="Buat kerangka awal rapor untuk seluruh siswa di kelas tertentu sekaligus."
      />

      {/* Configuration Panel */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Pengaturan Generate
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Sekolah</label>
            <select 
              value={filterUnit} 
              onChange={(e) => { setFilterUnit(e.target.value); setFilterClass(""); setFilterPeriod(""); setFilterTemplate(""); }} 
              disabled={!!activeUnitId}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Pilih Unit --</option>
              {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tahun Ajaran</label>
            <select 
              value={filterAcademicYear} 
              onChange={(e) => { setFilterAcademicYear(e.target.value); setFilterClass(""); setFilterPeriod(""); }} 
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {academicYears?.data?.map(ay => <option key={ay.id} value={ay.id as string}>{ay.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              disabled={!filterUnit || !filterAcademicYear || isClassesLoading}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value="">-- Pilih Kelas --</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periode Rapor</label>
            <select 
              value={filterPeriod} 
              onChange={(e) => setFilterPeriod(e.target.value)} 
              disabled={!filterUnit || !filterAcademicYear}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value="">-- Pilih Periode --</option>
              {periods?.data?.map(p => <option key={p.id} value={p.id as string}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gunakan Template</label>
            <select 
              value={filterTemplate} 
              onChange={(e) => setFilterTemplate(e.target.value)} 
              disabled={!filterUnit}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value="">-- Pilih Template --</option>
              {templates?.data?.map(t => <option key={t.id} value={t.id as string}>{t.name} ({t.report_type})</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* Preview Panel */}
      {isFormValid && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-6 py-4 bg-muted/20 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Preview Siswa
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                Total: {previewData.length} Siswa
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                Siap Generate: {readyToGenerateCount}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                Sudah Ada: {alreadyGeneratedCount}
              </div>
            </div>
          </div>

          {isLoadingPreview ? (
            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Menganalisis data siswa...</p>
            </div>
          ) : previewData.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Tidak Ada Siswa</h3>
              <p className="text-muted-foreground text-sm">
                Tidak ditemukan siswa aktif di kelas ini. Pastikan Anda telah mengalokasikan siswa ke kelas.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-background text-muted-foreground text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-6 py-3 w-12 text-center">No</th>
                    <th className="px-6 py-3">Nama Siswa</th>
                    <th className="px-6 py-3 w-32">NISN</th>
                    <th className="px-6 py-3 w-48 text-center">Status Rapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.map((student, idx) => (
                    <tr key={student.id} className={student.hasDraft ? "bg-muted/10" : "hover:bg-muted/30 transition-colors"}>
                      <td className="px-6 py-3 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-6 py-3 font-medium text-foreground">{(student as any).full_name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{(student as any).nisn || "-"}</td>
                      <td className="px-6 py-3 text-center">
                        {student.hasDraft ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Ada ({student.reportStatus})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            Belum Ada Draft
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Footer */}
          <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {readyToGenerateCount > 0 
                ? "Sistem akan membuat draft untuk siswa yang belum memiliki rapor di periode ini." 
                : "Semua siswa di kelas ini sudah memiliki rapor untuk periode yang dipilih."}
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || readyToGenerateCount === 0}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Generate {readyToGenerateCount} Draft Rapor
            </button>
          </div>
        </div>
      )}

      {/* Info Notice */}
      {!isFormValid && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileBadge className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-2">Pilih Konfigurasi</h3>
          <p className="text-blue-700 text-sm max-w-md mx-auto">
            Silakan pilih Unit, Tahun Ajaran, Kelas, Periode, dan Template di atas untuk melihat daftar siswa dan memulai proses pembuatan rapor.
          </p>
        </div>
      )}
    </div>
  );
};
