
import { useGetIdentity, useList, useOne } from "@refinedev/core";
import { Link } from "react-router-dom";
import { 
  Users, UserPlus, Building, ClipboardList, 
  Megaphone, UploadCloud, CheckCircle2, 
  AlertCircle, Clock, Activity, Briefcase
} from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

// --- WIDGET 1: Greeting Card ---
const GreetingCard = () => {
  const { data: identity } = useGetIdentity<any>();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();

  const { data: unitData } = useOne({
    resource: "units",
    id: activeUnitId || "",
    queryOptions: { enabled: !!activeUnitId },
  });

  const { data: yearData } = useOne({
    resource: "academic_years",
    id: activeYearId || "",
    queryOptions: { enabled: !!activeYearId },
  });

  return (
    <div className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2">Assalamualaikum, {identity?.full_name?.split(' ')[0] || "Admin"}!</h2>
      <p className="text-primary-foreground/80 mb-6 text-sm sm:text-base">
        Selamat datang di pusat kendali operasional TSLS.
      </p>
      
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-xs text-primary-foreground/70 uppercase tracking-wider font-semibold mb-1">Unit Aktif</p>
          <p className="font-medium truncate">{unitData?.data?.name || "Memuat..."}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-xs text-primary-foreground/70 uppercase tracking-wider font-semibold mb-1">Tahun Ajaran</p>
          <p className="font-medium truncate">{yearData?.data?.name || "Memuat..."}</p>
        </div>
      </div>
    </div>
  );
};

// --- WIDGET 2: Quick Actions ---
const QuickActions = () => {
  const actions = [
    { label: "Tambah Siswa", icon: UserPlus, href: "/students/create", color: "bg-blue-50 text-blue-600" },
    { label: "Tambah Guru", icon: Briefcase, href: "/employees/create", color: "bg-emerald-50 text-emerald-600" },
    { label: "Tambah Kelas", icon: Building, href: "/classes/create", color: "bg-amber-50 text-amber-600" },
    { label: "Buat Task", icon: ClipboardList, href: "/tasks/create", color: "bg-purple-50 text-purple-600" },
    { label: "Pengumuman", icon: Megaphone, href: "/communications", color: "bg-rose-50 text-rose-600" },
    { label: "Upload Dokumen", icon: UploadCloud, href: "/documents", color: "bg-cyan-50 text-cyan-600" },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Aksi Cepat</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link 
              key={idx} 
              to={action.href}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border hover:bg-muted/50 transition-colors text-center gap-2 group"
            >
              <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// --- WIDGET 3: Today Summary ---
const TodaySummary = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();

  // Fetches
  const { data: students } = useList({
    resource: "students",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "active" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ]
  });

  const { data: teachers } = useList({
    resource: "employees",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "position", operator: "eq", value: "guru" }
    ]
  });

  const { data: classes } = useList({
    resource: "classes",
    pagination: { pageSize: 1 },
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ]
  });

  const { data: tasks } = useList({
    resource: "admin_tasks",
    pagination: { pageSize: 1 },
    filters: [
      { field: "status", operator: "ne", value: "selesai" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ]
  });

  const stats = [
    { label: "Siswa Aktif", value: students?.total ?? "-", icon: Users },
    { label: "Guru Aktif", value: teachers?.total ?? "-", icon: Briefcase },
    { label: "Kelas Aktif", value: classes?.total ?? "-", icon: Building },
    { label: "Task Tertunda", value: tasks?.total ?? "-", icon: ClipboardList },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="bg-card rounded-2xl p-5 shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- WIDGET 4: Data Health Score ---
const DataHealthScore = () => {
  // In a real huge app, this would be a single RPC call. 
  // For now, we calculate percentages client-side using `total`.
  const { data: totalStudents } = useList({ resource: "students", pagination: { pageSize: 1 } });
  const { data: completeStudents } = useList({ 
    resource: "students", 
    pagination: { pageSize: 1 },
    filters: [
      { field: "nisn", operator: "nnull", value: true } // assuming NISN is a marker of completeness
    ]
  });

  const { data: totalParents } = useList({ resource: "parents", pagination: { pageSize: 1 } });
  const { data: completeParents } = useList({
    resource: "parents",
    pagination: { pageSize: 1 },
    filters: [
      { field: "phone", operator: "nnull", value: true }
    ]
  });

  const { data: totalEmployees } = useList({ resource: "employees", pagination: { pageSize: 1 } });
  const { data: completeEmployees } = useList({
    resource: "employees",
    pagination: { pageSize: 1 },
    filters: [
      { field: "nik", operator: "nnull", value: true }
    ]
  });

  const studentScore = totalStudents?.total ? Math.round((completeStudents?.total || 0) / totalStudents.total * 100) : 100;
  const parentScore = totalParents?.total ? Math.round((completeParents?.total || 0) / totalParents.total * 100) : 100;
  const employeeScore = totalEmployees?.total ? Math.round((completeEmployees?.total || 0) / totalEmployees.total * 100) : 100;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-semibold">Kesehatan Data</h3>
      </div>
      
      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-muted-foreground">Kelengkapan Data Siswa</span>
            <span className="font-bold">{studentScore}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full ${studentScore < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${studentScore}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-muted-foreground">Kelengkapan Data Orang Tua</span>
            <span className="font-bold">{parentScore}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full ${parentScore < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${parentScore}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-muted-foreground">Kelengkapan Data Pegawai</span>
            <span className="font-bold">{employeeScore}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full ${employeeScore < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${employeeScore}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- WIDGET 5: Admin Task Preview ---
const AdminTaskPreview = () => {
  const { activeUnitId } = useCurrentUnit();
  const { data, isLoading } = useList({
    resource: "admin_tasks",
    pagination: { pageSize: 5 },
    sorters: [{ field: "created_at", order: "desc" }],
    filters: [
      { field: "status", operator: "ne", value: "selesai" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ]
  });

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          Task Belum Selesai
        </h3>
        <Link to="/tasks" className="text-sm text-primary hover:underline">Lihat Semua</Link>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat tasks...</p>
        ) : data?.data?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            Semua task telah selesai!
          </div>
        ) : (
          <ul className="space-y-3">
            {data?.data.map((task: any) => (
              <li key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 shrink-0"></div>
                <div>
                  <p className="font-medium text-sm leading-tight">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Batas waktu: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : "Belum ditentukan"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- WIDGET 6: Recent Activity ---
const RecentActivity = () => {
  const { data, isLoading } = useList({
    resource: "audit_logs",
    pagination: { pageSize: 5 },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "*, auth_users:changed_by(email)"
    }
  });

  const getActionText = (log: any) => {
    const table = log.table_name;
    const action = log.action === "insert" ? "menambahkan" : log.action === "update" ? "memperbarui" : "menghapus";
    return `Sistem ${action} data ${table}`;
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Aktivitas Terbaru</h3>
      </div>
      
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat aktivitas...</p>
      ) : (
        <div className="space-y-4">
          {data?.data.map((log: any) => (
            <div key={log.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{getActionText(log)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(log.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          ))}
          {data?.data.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>}
        </div>
      )}
    </div>
  );
};

// --- WIDGET 7: Follow-up Alert ---
const FollowupAlert = () => {
  const { data, isLoading } = useList({
    resource: "students",
    pagination: { pageSize: 1 },
    filters: [{ field: "nisn", operator: "null", value: true }]
  });

  const missingNisnCount = data?.total || 0;

  if (isLoading || missingNisnCount === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-4 items-start">
      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg shrink-0">
        <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-500" />
      </div>
      <div>
        <h4 className="font-semibold text-amber-900 dark:text-amber-500 mb-1">Perhatian Diperlukan</h4>
        <p className="text-sm text-amber-800/80 dark:text-amber-500/80 mb-2">Terdapat {missingNisnCount} siswa yang belum melengkapi data NISN. Harap segera perbarui data atau hubungi wali kelas terkait.</p>
        <Link to="/students" className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
          Lengkapi Data Siswa &rarr;
        </Link>
      </div>
    </div>
  );
};


// --- MAIN DASHBOARD PAGE ---
export const DashboardPage = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Row: Greeting & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GreetingCard />
        <QuickActions />
      </div>

      {/* Stats Row */}
      <TodaySummary />

      {/* Middle Row: Alerts & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FollowupAlert />
          <AdminTaskPreview />
        </div>
        <div className="space-y-6">
          <DataHealthScore />
          <RecentActivity />
        </div>
      </div>
      
    </div>
  );
};
