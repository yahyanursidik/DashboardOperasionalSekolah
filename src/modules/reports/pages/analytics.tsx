import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Activity, BookOpen, GraduationCap, TrendingUp, AlertCircle } from "lucide-react";

// --- MOCK DATA FOR DEMONSTRATION ---
// In a fully developed production app, these would be aggregated via RPC calls or complex client-side reduction.
const attendanceData = [
  { name: 'Jul', hadir: 95, izin: 3, sakit: 2 },
  { name: 'Ags', hadir: 92, izin: 5, sakit: 3 },
  { name: 'Sep', hadir: 88, izin: 7, sakit: 5 },
  { name: 'Okt', hadir: 94, izin: 4, sakit: 2 },
  { name: 'Nov', hadir: 96, izin: 2, sakit: 2 },
  { name: 'Des', hadir: 90, izin: 6, sakit: 4 },
];

const paymentData = [
  { name: 'Lunas', value: 85, color: '#10b981' },
  { name: 'Tunggakan', value: 15, color: '#ef4444' },
];

const quranLeaderboard = [
  { name: 'Ahmad Faiz', capaian: 15, unit: 'SMP' },
  { name: 'Zahra Nisa', capaian: 14, unit: 'SD' },
  { name: 'Budi Santoso', capaian: 12, unit: 'SMA' },
  { name: 'Aisyah Putri', capaian: 11, unit: 'SMP' },
  { name: 'Umar Faruq', capaian: 10, unit: 'SD' },
];

const tahsinLeaderboard = [
  { name: 'Khadijah', skor: 98 },
  { name: 'Ali bin Abi', skor: 95 },
  { name: 'Hasan', skor: 92 },
  { name: 'Fatimah', skor: 89 },
  { name: 'Usman', skor: 88 },
];

const classComparison = [
  { subject: 'Kehadiran', KelasA: 95, KelasB: 88, fullMark: 100 },
  { subject: 'Rata-rata Nilai', KelasA: 85, KelasB: 92, fullMark: 100 },
  { subject: 'Hafalan', KelasA: 70, KelasB: 85, fullMark: 100 },
  { subject: 'Ketuntasan', KelasA: 90, KelasB: 80, fullMark: 100 },
  { subject: 'Kedisiplinan', KelasA: 95, KelasB: 85, fullMark: 100 },
];

export const VisualAnalytics: React.FC = () => {

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Analitik Visual"
        description="Dashboard analitik komprehensif untuk memantau performa siswa, kehadiran, dan keuangan."
      />

      {/* TREN KEHADIRAN & PEMBAYARAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Tren Kehadiran */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-foreground">Tren Kehadiran Siswa (Semester Ganjil)</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" name="Hadir (%)" dataKey="hadir" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Izin (%)" dataKey="izin" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" name="Sakit (%)" dataKey="sakit" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status Pembayaran */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-foreground">Rasio Pembayaran SPP</h3>
          </div>
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Persentase']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
              <p className="text-3xl font-black text-emerald-600">{paymentData[0].value}%</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lunas</p>
            </div>
          </div>
        </div>

      </div>

      {/* LEADERBOARD QURAN & TAHSIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Leaderboard Hafalan */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-teal-500" />
            <h3 className="text-lg font-bold text-foreground">Top 5 Hafalan Al-Qur'an (Juz)</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quranLeaderboard} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value} Juz`, 'Hafalan']}
                />
                <Bar dataKey="capaian" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Leaderboard Tahsin */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-foreground">Top 5 Nilai Tahsin</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tahsinLeaderboard} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}`, 'Skor']}
                />
                <Bar dataKey="skor" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={36}>
                  {
                    tahsinLeaderboard.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ANALISIS ANTAR KELAS & KENDALA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Chart: Perbandingan Kelas */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-foreground">Perbandingan Kelas (A vs B)</h3>
          </div>
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={classComparison}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Kelas 7A" dataKey="KelasA" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Radar name="Kelas 7B" dataKey="KelasB" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kendala Pembelajaran / Insights */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-foreground">Insight Kendala Pembelajaran Siswa</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-xl border bg-rose-50/50 border-rose-100 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-rose-600 rotate-180" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900">Penurunan Kehadiran Kelas 8B</h4>
                <p className="text-sm text-rose-800/80 mt-1 leading-relaxed">
                  Bulan ini terjadi lonjakan izin sakit sebesar 15% di kelas 8B. Disarankan wali kelas melakukan komunikasi lebih lanjut dengan orang tua murid.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-100 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900">Target Hafalan Kelas 7 Tertinggal</h4>
                <p className="text-sm text-amber-800/80 mt-1 leading-relaxed">
                  Rata-rata hafalan kelas 7 baru mencapai 60% dari target semester. Diperlukan penambahan jam murojaah atau pendekatan intensif.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-emerald-50/50 border-emerald-100 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900">Peningkatan Tren Kedisiplinan</h4>
                <p className="text-sm text-emerald-800/80 mt-1 leading-relaxed">
                  Secara keseluruhan pelanggaran disiplin (keterlambatan) menurun 25% pasca penerapan sistem poin baru.
                </p>
              </div>
            </div>
          </div>
          
        </div>

      </div>

    </div>
  );
};
