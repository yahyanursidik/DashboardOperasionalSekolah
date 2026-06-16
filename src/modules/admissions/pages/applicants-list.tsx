import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Search, Filter, Eye, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { mockApplicants, getSpmbSettings } from "../mock";

export const ApplicantsList: React.FC = () => {
  const currentAcademicYear = getSpmbSettings().academicYear;
  const [selectedYear, setSelectedYear] = React.useState(currentAcademicYear);
  const [selectedStatus, setSelectedStatus] = React.useState("Semua");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredApplicants = mockApplicants.filter(app => {
    const matchesYear = selectedYear === "Semua" || app.academicYear === selectedYear;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "Semua" || app.status === selectedStatus;
    return matchesYear && matchesSearch && matchesStatus;
  });

  // Get unique years from mock data, ensure current is always there
  const allYears = Array.from(new Set([...mockApplicants.map(a => a.academicYear), currentAcademicYear])).sort().reverse();
  const allStatuses = Array.from(new Set(mockApplicants.map(a => a.status))).sort();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Daftar Pendaftar SPMB" 
        description="Kelola dan verifikasi berkas calon siswa baru."
      />

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau no registrasi..." 
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-white border px-4 py-2 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Semua">Semua Tahun</option>
                {allYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <CalendarDays className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative w-full sm:w-auto">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-white border px-4 py-2 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Semua">Semua Status</option>
                {allStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">No. Registrasi</th>
                <th className="px-6 py-4">Nama Pendaftar</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Asal Sekolah</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Nilai Tes</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredApplicants.length > 0 ? filteredApplicants.map((app) => (
                <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{app.id}</td>
                  <td className="px-6 py-4">{app.name}</td>
                  <td className="px-6 py-4 font-semibold">{app.unit}</td>
                  <td className="px-6 py-4 text-muted-foreground">{app.school}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${app.status === 'Lulus Tes' ? 'bg-emerald-100 text-emerald-700' : 
                        app.status === 'Verifikasi Valid' ? 'bg-blue-100 text-blue-700' : 
                        app.status === 'Berkas Lengkap' ? 'bg-purple-100 text-purple-700' : 
                        'bg-amber-100 text-amber-700'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">{app.score}</td>
                  <td className="px-6 py-4 flex items-center justify-center gap-2">
                    <Link to={`/admissions/applicants/${app.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Lihat Detail">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Verifikasi">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Tolak">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada data pendaftar untuk tahun akademik atau kata kunci pencarian ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
