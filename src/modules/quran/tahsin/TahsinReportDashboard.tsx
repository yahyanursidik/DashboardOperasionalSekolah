import React, { useState, useMemo } from "react";
import { useSelect, useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Award, BookOpen, Target, TrendingUp } from "lucide-react";

export const TahsinReportDashboard: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: studentOptions } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedClassId ? [
      { field: "class_id", operator: "eq", value: selectedClassId },
      { field: "status", operator: "eq", value: "active" }
    ] : [],
    queryOptions: {
      enabled: !!selectedClassId,
    },
    sorters: [{ field: "full_name", order: "asc" }],
  });

  // Fetch Student Targets
  const { data: targetsData } = useList({
    resource: "tahsin_student_targets",
    filters: [
      { field: "student_id", operator: "eq", value: selectedStudentId },
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId },
      { field: "target_type", operator: "eq", value: "tahsin" }
    ],
    queryOptions: { enabled: !!selectedStudentId }
  });

  // Fetch Daily Records
  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      { field: "student_id", operator: "eq", value: selectedStudentId },
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId },
      { field: "record_type", operator: "eq", value: "tahsin" }
    ],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, employees(full_name), tahfidz_halaqohs(name)" },
    queryOptions: { enabled: !!selectedStudentId }
  });

  // Fetch Assessments
  const { data: assessmentsData } = useList({
    resource: "quran_assessments",
    filters: [
      { field: "student_id", operator: "eq", value: selectedStudentId },
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId },
      { field: "assessment_type", operator: "eq", value: "tahsin_jilid" }
    ],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, employees(full_name)" },
    queryOptions: { enabled: !!selectedStudentId }
  });

  const records = recordsData?.data || [];
  const assessments = assessmentsData?.data || [];
  const target = targetsData?.data?.[0]; // Get the first target if exists

  // Calculate Progress Logic
  const progressPercentage = useMemo(() => {
    if (!target) return 0;
    
    // For Tahsin, target is usually Jilid/Halaman. We use record count as proxy.
    const achievedCount = records.length; 
    let targetTotal = target.target_amount;

    if (target.amount_unit === 'jilid') targetTotal = target.target_amount * 40; // assume 40 pages per jilid

    const rawPercentage = (achievedCount / targetTotal) * 100;
    return Math.min(Math.round(rawPercentage), 100);
  }, [records, target]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    
    const reversed = [...records].reverse(); // oldest to newest
    let cumulative = 0;
    return reversed.map(r => {
      cumulative += 1;
      return {
        date: new Date(r.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        ziyadah: 1,
        cumulative,
      };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard & Laporan Tahsin"
        description="Pantau perkembangan tilawah, grafik capaian, dan ujian kenaikan jilid."
      />

      {/* Filter Section */}
      <div className="bg-card p-4 border rounded-xl shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Pilih Kelas</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedStudentId("");
            }}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Semua Kelas</option>
            {classOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Pilih Santri</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={!selectedClassId}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
          >
            <option value="">-- Pilih Santri --</option>
            {studentOptions?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="bg-muted/30 border border-dashed rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Pilih Santri</h3>
          <p className="text-muted-foreground mt-1">Silakan pilih kelas dan santri untuk melihat laporan tahsin.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-indigo-100 font-medium text-sm">Target Tahsin</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {target ? `${target.target_amount} ${target.amount_unit}` : "Belum Ada Target"}
                    </h3>
                  </div>
                  <Target className="w-8 h-8 text-indigo-200" />
                </div>
                {target && (
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-indigo-100">
                      <span>Progres Estimasi ({progressPercentage}%)</span>
                      <span>Berdasarkan {records.length} Setoran</span>
                    </div>
                    <div className="h-2 bg-indigo-900/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000" 
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground font-medium text-sm">Total Hari Tilawah</p>
                  <h3 className="text-3xl font-bold mt-1 text-foreground">{records.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Selama semester aktif</p>
                </div>
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground font-medium text-sm">Ujian Jilid</p>
                  <h3 className="text-3xl font-bold mt-1 text-foreground">{assessments.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assessments.filter(a => a.status === 'Lulus').length} Lulus Kenaikan Jilid
                  </p>
                </div>
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Grafik Perolehan Tilawah (Kumulatif)
              </h3>
            </div>
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Total Catatan"
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                Belum ada data jurnal tilawah
              </div>
            )}
          </div>

          {/* Evaluasi Harian & Hasil Ujian Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Records Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="font-semibold">Buku Jurnal Tilawah Harian</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                  {records.length} Catatan
                </span>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Tgl</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Jilid/Halaman</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Evaluasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Tidak ada catatan jurnal.</td></tr>
                    ) : records.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(record.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{record.surah_or_jilid}</div>
                          <div className="text-xs text-muted-foreground">{record.ayat_or_page}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold">{record.fluency_score}</span>
                            {(record.tajwid_score || record.makhroj_score) && (
                              <div className="text-[10px] text-muted-foreground flex gap-2">
                                {record.tajwid_score && <span>T: {record.tajwid_score}</span>}
                                {record.makhroj_score && <span>M: {record.makhroj_score}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assessments Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="font-semibold">Riwayat Kenaikan Jilid</h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                  {assessments.length} Ujian
                </span>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Tgl / Judul</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Nilai</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assessments.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Tidak ada riwayat ujian jilid.</td></tr>
                    ) : assessments.map((assessment) => (
                      <tr key={assessment.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{assessment.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(assessment.date).toLocaleDateString('id-ID')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold">{assessment.score}</div>
                          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">{assessment.predicate}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            assessment.status === 'Lulus' ? 'bg-emerald-100 text-emerald-700' :
                            assessment.status === 'Lulus Bersyarat' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {assessment.status || 'Lulus'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
