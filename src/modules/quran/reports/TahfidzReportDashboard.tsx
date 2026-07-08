import React, { useState, useMemo } from "react";
import { useSelect, useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Award, BookOpen, Target, TrendingUp } from "lucide-react";

export const TahfidzReportDashboard: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    pagination: { mode: "off" }
  });
  const halaqohs = halaqohsData?.data || [];

  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "*, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });
  const members = membersData?.data || [];

  // Fetch Student Targets
  const { data: targetsData } = useList({
    resource: "tahfidz_student_targets",
    filters: [
      { field: "student_id", operator: "eq", value: selectedStudentId },
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId }
    ],
    queryOptions: { enabled: !!selectedStudentId }
  });

  // Fetch Daily Records
  const { data: recordsData } = useList({
    resource: "quran_records",
    filters: [
      { field: "student_id", operator: "eq", value: selectedStudentId },
      { field: "academic_year_id", operator: "eq", value: activeYearId },
      { field: "semester_id", operator: "eq", value: activeSemesterId }
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
      { field: "semester_id", operator: "eq", value: activeSemesterId }
    ],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, employees(full_name)" },
    queryOptions: { enabled: !!selectedStudentId }
  });

  const records = recordsData?.data || [];
  const assessments = assessmentsData?.data || [];
  const target = targetsData?.data?.[0]; // Get the first target if exists

  // Calculate Progress Logic (Approximation based on number of records)
  const progressPercentage = useMemo(() => {
    if (!target) return 0;
    
    // As per user feedback: "ada halaman ada jumlah berapa ayat"
    // We approximate: 1 record = 1 page, or 1 record = some amount.
    // In a full implementation, we'd add numeric achieved pages/ayats per record.
    // Here we use the count of ziyadah records as a proxy for progress against the target.
    const achievedCount = records.length; 
    let targetTotal = target.target_amount;

    if (target.amount_unit === 'juz') targetTotal = target.target_amount * 20; // 1 juz = 20 pages
    if (target.amount_unit === 'surah') targetTotal = target.target_amount * 2; // rough assumption

    const rawPercentage = (achievedCount / targetTotal) * 100;
    return Math.min(Math.round(rawPercentage), 100);
  }, [records, target]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    
    // Group records by week/month for the chart. Let's do daily cumulative for simplicity here.
    const reversed = [...records].reverse(); // oldest to newest
    let cumulative = 0;
    return reversed.map(r => {
      cumulative += 1;
      return {
        date: new Date(r.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        ziyadah: 1, // 1 entry
        cumulative,
      };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard & Laporan Tahfidz"
        description="Pantau perkembangan hafalan, grafik ziyadah, dan hasil ujian tahfidz siswa."
      />

      {/* Filter Section */}
      <div className="bg-card p-4 border rounded-xl shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Pilih Halaqoh</label>
          <select
            value={selectedHalaqoh}
            onChange={(e) => {
              setSelectedHalaqoh(e.target.value);
              setSelectedStudentId("");
            }}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Semua Halaqoh</option>
            {halaqohs.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Pilih Siswa</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={!selectedHalaqoh}
            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
          >
            <option value="">-- Pilih Siswa --</option>
            {members.map(member => {
              const student = member.students;
              if (!student) return null;
              return (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="bg-muted/30 border border-dashed rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Pilih Siswa</h3>
          <p className="text-muted-foreground mt-1">Silakan pilih halaqoh dan siswa untuk melihat laporan tahfidz.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-emerald-100 font-medium text-sm">Target Semester Ini</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {target ? `${target.target_amount} ${target.amount_unit}` : "Belum Ada Target"}
                    </h3>
                  </div>
                  <Target className="w-8 h-8 text-emerald-200" />
                </div>
                {target && (
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-emerald-100">
                      <span>Progres ({progressPercentage}%)</span>
                      <span>Berdasarkan {records.length} Setoran</span>
                    </div>
                    <div className="h-2 bg-emerald-900/30 rounded-full overflow-hidden">
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
                  <p className="text-muted-foreground font-medium text-sm">Total Hari Setoran</p>
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
                  <p className="text-muted-foreground font-medium text-sm">Ujian Munaqosyah</p>
                  <h3 className="text-3xl font-bold mt-1 text-foreground">{assessments.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assessments.filter(a => a.status === 'Lulus').length} Lulus
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
                <TrendingUp className="w-5 h-5 text-primary" />
                Grafik Perolehan Ziyadah (Kumulatif)
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
                      name="Total Setoran"
                      stroke="#0ea5e9" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                Belum ada data setoran untuk grafik
              </div>
            )}
          </div>

          {/* Evaluasi Harian & Hasil Ujian Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Records Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="font-semibold">Evaluasi Hafalan Harian</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  {records.length} Catatan
                </span>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Tgl</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Surah/Ayat</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Evaluasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Tidak ada data setoran.</td></tr>
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
                <h3 className="font-semibold">Hasil Ujian Munaqosyah</h3>
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
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Tidak ada riwayat ujian.</td></tr>
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
