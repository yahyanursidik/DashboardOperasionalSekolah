import React, { useState } from "react";
import {
  useShow, useList, useCreate, useSelect, useUpdate
} from "@refinedev/core";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import {
  User, Edit, ArrowLeft, GraduationCap, Building2,
  Phone, Mail, MapPin, X, Plus, Trash2, FolderOpen, History,
  BookOpen, Calendar, Clock, CheckCircle2, XCircle,
  Award, ClipboardList, UserCheck, Star, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  academicAssignmentTypes,
  canReceiveAcademicAssignment,
  getAttendanceMode,
  getEmployeePosition,
  getEmploymentType,
} from "../employee-role-config";
import { formatScheduleType, formatTime } from "../../schedules/schedule-utils";
import { validateTeachingScheduleCurriculum } from "../../schedules/curriculum-schedule-validation";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const POSITION_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  kepala_sekolah: { label: "Kepala Sekolah",       color: "bg-purple-100 text-purple-800", icon: Star },
  wakasek_umum: { label: "Wakil Kepala Sekolah", color: "bg-indigo-100 text-indigo-800", icon: Star },
  wakasek_kurikulum: { label: "Wakasek Kurikulum",  color: "bg-indigo-100 text-indigo-800", icon: Star },
  wakasek_kesiswaan: { label: "Wakasek Kesiswaan",  color: "bg-indigo-100 text-indigo-800", icon: Star },
  kepala_unit:    { label: "Kepala Unit",            color: "bg-pink-100 text-pink-800", icon: Building2 },
  guru:           { label: "Guru / Pengajar",        color: "bg-blue-100 text-blue-800",    icon: GraduationCap },
  guru_quran:     { label: "Guru Al Qur'an",         color: "bg-emerald-100 text-emerald-800", icon: BookOpen },
  school_center:  { label: "School Center",  color: "bg-pink-100 text-pink-800", icon: Building2 },
  bendahara:      { label: "Bendahara / Keuangan", color: "bg-emerald-100 text-emerald-800", icon: ClipboardList },
  penanggung_jawab:{ label: "Penanggung Jawab", color: "bg-cyan-100 text-cyan-800", icon: UserCheck },
  bk:             { label: "Bimbingan Konseling", color: "bg-fuchsia-100 text-fuchsia-800", icon: User },
  pustakawan:     { label: "Pustakawan",     color: "bg-orange-100 text-orange-800", icon: BookOpen },
  laboran:        { label: "Laboran",        color: "bg-yellow-100 text-yellow-800", icon: UserCheck },
  tu:             { label: "Tata Usaha",             color: "bg-amber-100 text-amber-800",  icon: ClipboardList },
  sarpras:        { label: "Sarana Prasarana",       color: "bg-orange-100 text-orange-800", icon: Building2 },
  satpam:         { label: "Satpam / Security",      color: "bg-slate-100 text-slate-800", icon: UserCheck },
  cleaning_service:{ label: "Cleaning Service",     color: "bg-teal-100 text-teal-800",    icon: UserCheck },
  lainnya:        { label: "Lainnya",                color: "bg-gray-100 text-gray-800",    icon: UserCheck },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Aktif",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  inactive: { label: "Nonaktif", color: "text-gray-600",    bg: "bg-gray-50 border-gray-200" },
  resigned: { label: "Resign",   color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  contract: { label: "Kontrak",  color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200" },
};

const ROLE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  homeroom:      { label: "Wali Kelas",          color: "bg-emerald-100 text-emerald-800" },
  subject:       { label: "Guru Mata Pelajaran", color: "bg-blue-100 text-blue-800" },
  subject_teacher:{ label: "Guru Mata Pelajaran", color: "bg-blue-100 text-blue-800" },
  coordinator:   { label: "Koordinator Akademik", color: "bg-purple-100 text-purple-800" },
  wali_kelas:   { label: "Wali Kelas",          color: "bg-emerald-100 text-emerald-800" },
  guru_mapel:   { label: "Guru Mata Pelajaran",  color: "bg-blue-100 text-blue-800" },
  guru_quran:   { label: "Guru Al-Qur'an / Tahfizh", color: "bg-amber-100 text-amber-800" },
  guru_diniyah: { label: "Guru Diniyah",        color: "bg-purple-100 text-purple-800" },
  staff:        { label: "Staff Non-Akademik",  color: "bg-gray-100 text-gray-800" },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-cyan-500 to-sky-600",
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | undefined | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value || "-"}</p>
      </div>
    </div>
  );
}

// ─── Assignment Modal ──────────────────────────────────────────────────────────
function AssignmentModal({
  open, onClose, employeeId, employeePosition, defaultUnitId, activeYearId, activeSemesterId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeePosition: string;
  defaultUnitId?: string | null;
  activeYearId: string | undefined;
  activeSemesterId: string | undefined;
  onSuccess: () => void;
}) {
  const [assignmentType, setAssignmentType] = useState("guru_mapel");
  const [unitId, setUnitId] = useState(defaultUnitId || "");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const selectedAssignmentType = academicAssignmentTypes.find((item) => item.value === assignmentType);

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      ...(unitId ? [{ field: "unit_id", operator: "eq" as const, value: unitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    queryOptions: { enabled: !!unitId },
  });

  const { data: subjectsData } = useList({
    resource: "subjects",
    pagination: { pageSize: 200 },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    meta: { select: "id, name, code, unit_id" },
  });
  const subjectOptions = (subjectsData?.data ?? []).filter((subject) => !unitId || !subject.unit_id || subject.unit_id === unitId);
  const selectedSubject = subjectOptions.find((subject) => subject.id === subjectId);

  const { mutate: createAssignment, isLoading: isAssigning } = useCreate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYearId || !activeSemesterId) return toast.error("Pilih tahun ajaran dan semester aktif.");
    if (selectedAssignmentType?.requiresSubject && classId && subjectId) {
      try {
        const validation = await validateTeachingScheduleCurriculum({ classId, subjectId, academicYearId: activeYearId, semesterId: activeSemesterId });
        if (!validation.valid) return toast.error("Penugasan belum dapat dibuat", { description: validation.message });
      } catch (error: unknown) {
        return toast.error(error instanceof Error ? error.message : "Gagal memeriksa kurikulum kelas.");
      }
    }
    createAssignment(
      {
        resource: "teacher_assignments",
        values: {
          employee_id: employeeId,
          unit_id: unitId,
          class_id: classId || null,
          role_type: assignmentType,
          subject_id: subjectId || null,
          subject: selectedSubject?.name || null,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
          is_active: true,
        },
        successNotification: () => ({ message: "Penugasan berhasil ditambahkan!", type: "success" }),
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
          setClassId(""); setSubjectId("");
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Tambah Penugasan Akademik</h3>
              <p className="text-xs text-muted-foreground">Tetapkan tanggung jawab untuk satu periode pembelajaran.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Jenis Penugasan */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Jenis / Peran Penugasan <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {academicAssignmentTypes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { setAssignmentType(item.value); setClassId(""); setSubjectId(""); }}
                  className={`text-left text-xs px-3 py-2.5 rounded-lg border font-medium transition-all ${
                    assignmentType === item.value
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Unit Pendidikan <span className="text-destructive">*</span></label>
            <select
              required
              value={unitId}
              onChange={(e) => { setUnitId(e.target.value); setClassId(""); setSubjectId(""); }}
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">-- Pilih Unit --</option>
              {unitOptions?.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          {/* Kelas */}
          {selectedAssignmentType?.requiresClass && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Kelas <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                disabled={!unitId}
              >
                <option value="">-- Pilih Kelas --</option>
                {classOptions?.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {!unitId && <p className="text-[11px] text-amber-600">Pilih unit terlebih dahulu.</p>}
            </div>
          )}

          {selectedAssignmentType?.requiresSubject && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Mata Pelajaran <span className="text-destructive">*</span></label>
              <select
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""}</option>)}
              </select>
            </div>
          )}

          {activeYearId && activeSemesterId ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                Penugasan terikat pada <strong>tahun ajaran dan semester aktif</strong>. Jadwal mengajar dibuat setelah penugasan ini tersimpan.
              </p>
            </div>
          ) : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Pilih tahun ajaran dan semester aktif sebelum membuat penugasan.</div>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              Batal
            </button>
            <button
              type="submit"
              disabled={isAssigning || !unitId || !activeYearId || !activeSemesterId || !canReceiveAcademicAssignment(employeePosition)}
              className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isAssigning ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : (
                <><Plus className="w-4 h-4" /> Simpan Penugasan</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Show Page ────────────────────────────────────────────────────────────
type TabType = "assignments" | "attendance" | "leaves" | "documents";

export const EmployeeShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/hrd") ? "/hrd/employees" : "/employees";
  const [activeTab, setActiveTab] = useState<TabType>("assignments");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { queryResult } = useShow({
    resource: "employees",
    id,
    meta: { select: "*, units(name)" },
  });
  const { data, isLoading } = queryResult;
  const record = data?.data;

  // Assignments
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useList({
    resource: "teacher_assignments",
    filters: [
      { field: "employee_id", operator: "eq" as const, value: record?.id as string },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    meta: { select: "*, units(name), classes(name)" },
    pagination: { pageSize: 100 },
    queryOptions: { enabled: !!record?.id },
  });

  const { data: schedulesData, isLoading: schedulesLoading } = useList({
    resource: "employee_schedules",
    filters: [
      { field: "employee_id", operator: "eq" as const, value: record?.id as string },
    ],
    sorters: [{ field: "day_of_week", order: "asc" }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(record?.id) },
  });

  // Leave requests
  const { data: leavesData, isLoading: leavesLoading } = useList({
    resource: "leave_requests",
    filters: [{ field: "employee_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 10 },
    queryOptions: { enabled: !!record?.id && activeTab === "leaves" },
  });

  const { mutate: updateAssignment } = useUpdate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-16 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Pegawai tidak ditemukan</h3>
        <button onClick={() => navigate(basePath)} className="text-sm text-primary hover:underline">
          Kembali ke daftar
        </button>
      </div>
    );
  }

  const avatarColor = getAvatarColor(record.full_name ?? "?");
  const pos = POSITION_MAP[record.position] ?? { label: record.position, color: "bg-gray-100 text-gray-800", icon: UserCheck };
  const sts = STATUS_MAP[record.status] ?? { label: record.status, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const assignments = assignmentsData?.data ?? [];
  const positionDefinition = getEmployeePosition(record.position);
  const academicEligible = canReceiveAcademicAssignment(record.position);
  const activeAssignments = assignments.filter((assignment) => assignment.is_active !== false);
  const schedules = (schedulesData?.data ?? []).filter((schedule) => schedule.attendance_shift_id || (
    (!activeYearId || !schedule.academic_year_id || schedule.academic_year_id === activeYearId)
    && (!activeSemesterId || !schedule.semester_id || schedule.semester_id === activeSemesterId)
  ));
  const teachingSchedules = schedules.filter((schedule) => schedule.schedule_type === "mengajar");
  const employmentType = getEmploymentType(record.employment_type);
  const attendanceMode = getAttendanceMode(record.attendance_mode);
  const followsTeachingSchedule = record.attendance_mode === "teaching_schedule";
  const portalLabel = positionDefinition.portal === "teacher" ? "Portal Pengajar" : "Portal Staf";
  const profileChecklist = [
    { label: "Identitas inti", done: Boolean(record.full_name && record.nik) },
    { label: "Unit dan jabatan", done: Boolean(record.position && (record.unit_id || record.units?.name)) },
    { label: "Kontak aktif", done: Boolean(record.phone && record.email) },
    { label: `Akses ${portalLabel}`, done: Boolean(record.email && record.user_id) },
    { label: followsTeachingSchedule ? "Jadwal mengajar part-time periode aktif" : academicEligible ? "Penugasan akademik periode aktif" : "Jadwal kerja periode aktif", done: followsTeachingSchedule ? teachingSchedules.length > 0 : academicEligible ? activeAssignments.length > 0 : schedules.length > 0 },
  ];
  const completedChecklist = profileChecklist.filter((item) => item.done).length;

  const TABS = [
    { key: "assignments" as TabType, label: "Penugasan & Jadwal", icon: BookOpen, count: activeAssignments.length + schedules.length },
    { key: "attendance" as TabType, label: "Riwayat Presensi", icon: Clock },
    { key: "leaves" as TabType, label: "Riwayat Cuti", icon: Calendar },
    { key: "documents" as TabType, label: "Dokumen", icon: FolderOpen },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Pegawai"
        description="Jabatan utama, penugasan periode, jadwal pelaksanaan, dan kesiapan portal pegawai."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate(basePath)}
              className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <Link
              to={`${basePath}/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
            >
              <Edit className="w-4 h-4" /> Edit Data
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT SIDEBAR ─── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Card */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            {/* Banner */}
            <div className={`h-20 bg-gradient-to-r ${avatarColor} opacity-20`} />
            <div className="px-5 pb-5 -mt-10">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-background mb-3`}>
                {getInitials(record.full_name ?? "?")}
              </div>
              <h2 className="text-xl font-bold text-foreground">{record.full_name}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pos.color}`}>
                  {pos.label}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sts.bg} ${sts.color}`}>
                  {sts.label}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{positionDefinition.description}</p>
            </div>

            <div className="border-t px-5 py-4 space-y-0.5">
              <InfoRow icon={Building2} label="Unit Induk"         value={record.units?.name || "Pusat / Lintas Unit"} />
              <InfoRow icon={UserCheck} label="Hubungan Kerja" value={employmentType.label} />
              <InfoRow icon={Clock} label="Pola Absensi" value={attendanceMode.label} />
              <InfoRow icon={Phone}     label="No. HP / WhatsApp"   value={record.phone} />
              <InfoRow icon={Mail}      label="Email"               value={record.email} />
              <InfoRow icon={MapPin}    label="Alamat Domisili"     value={record.address} />
              {record.birth_date && (
                <InfoRow icon={Calendar}  label="Tanggal Lahir"     value={new Date(record.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              {record.join_date && (
                <InfoRow icon={UserCheck} label="Bergabung Sejak"   value={new Date(record.join_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              {record.education && (
                <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={record.education} />
              )}
              {record.certification && (
                <InfoRow icon={Award} label="Sertifikasi" value={record.certification} />
              )}
            </div>
          </div>

          {followsTeachingSchedule && (
            <div className={`rounded-xl border p-4 shadow-sm ${teachingSchedules.length ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className={`text-sm font-bold ${teachingSchedules.length ? "text-emerald-900" : "text-amber-900"}`}>Presensi pengajar part-time</p>
              <p className={`mt-1 text-xs ${teachingSchedules.length ? "text-emerald-800" : "text-amber-800"}`}>
                {teachingSchedules.length
                  ? `${teachingSchedules.length} jadwal mengajar menjadi acuan. Hadir dihitung dari pelajaran pertama sampai pelajaran terakhir setiap hari.`
                  : "Belum ada jadwal mengajar aktif. Portal akan menonaktifkan absensi sampai jadwal periode aktif tersedia."}
              </p>
            </div>
          )}

          {/* Stats mini */}
          <div className="bg-card border rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ringkasan</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Penugasan Aktif</span>
                <span className="font-bold text-foreground">{activeAssignments.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Jadwal Periode</span>
                <span className="font-bold text-foreground">{schedules.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /> Akses Portal</span>
                <span className="font-semibold text-foreground">{portalLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kesiapan Data</p>
              <span className="text-xs font-bold text-primary">{completedChecklist}/{profileChecklist.length}</span>
            </div>
            <div className="space-y-2">
              {profileChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Lengkapi semua item agar data pegawai siap untuk jadwal, presensi, evaluasi kinerja, dan portal kerja.
            </p>
          </div>

          <div className="bg-card border rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Aksi Cepat</p>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/schedules?employee_id=${record.id}`} className="text-xs border rounded-lg px-3 py-2 hover:bg-muted flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Jadwal
              </Link>
              <Link to="/attendance/employees" className="text-xs border rounded-lg px-3 py-2 hover:bg-muted flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Presensi
              </Link>
              <Link to="/leaves" className="text-xs border rounded-lg px-3 py-2 hover:bg-muted flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Izin/Cuti
              </Link>
              <Link to="/pkg" className="text-xs border rounded-lg px-3 py-2 hover:bg-muted flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5" /> PKG
              </Link>
            </div>
          </div>
        </div>

        {/* ─── RIGHT CONTENT ─── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">1. Jabatan Utama</p>
              <p className="mt-2 text-sm font-semibold">{positionDefinition.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Struktur organisasi, portal dasar, dan pilihan shift.</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">2. Penugasan Periode</p>
              <p className="mt-2 text-sm font-semibold">{academicEligible ? `${activeAssignments.length} penugasan akademik` : "Tidak diperlukan"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Kelas/mapel pada tahun ajaran dan semester aktif.</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">3. Jadwal Pelaksanaan</p>
              <p className="mt-2 text-sm font-semibold">{schedules.length} jadwal mingguan</p>
              <p className="mt-1 text-xs text-muted-foreground">{followsTeachingSchedule ? "Pelajaran pertama dan terakhir menjadi batas kehadiran harian." : "Hari, jam, unit kerja, atau jam mengajar."}</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto border-b">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab: Penugasan ── */}
            {activeTab === "assignments" && (
              <div className="space-y-6 p-5">
                <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">Penugasan Akademik Periode</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hanya untuk tanggung jawab kelas/mapel; bukan jabatan dan bukan jam kerja.
                    </p>
                  </div>
                  {academicEligible ? (
                    <button onClick={() => setIsModalOpen(true)} disabled={!activeYearId || !activeSemesterId} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                      <Plus className="w-4 h-4" /> Tambah Penugasan Akademik
                    </button>
                  ) : null}
                </div>

                {!academicEligible ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <p className="font-semibold">Jabatan ini tidak memerlukan penugasan akademik.</p>
                    <p className="mt-1 text-xs">Atur rutinitas, shift, area layanan, atau tugas operasional melalui Jadwal Kerja di bawah.</p>
                  </div>
                ) : assignmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="bg-muted/20 border border-dashed rounded-xl p-10 text-center">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm text-foreground mb-1">Belum ada penugasan</p>
                    <p className="text-xs text-muted-foreground mb-4">Belum ada tanggung jawab kelas atau mata pelajaran untuk periode aktif.</p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah penugasan akademik
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => {
                      const roleInfo = ROLE_TYPE_MAP[assignment.role_type] ?? { label: assignment.role_type, color: "bg-gray-100 text-gray-800" };
                      return (
                        <div
                          key={assignment.id}
                          className="border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all bg-background group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                                  {roleInfo.label}
                                </span>
                                {assignment.is_active !== false ? (
                                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Aktif
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">Riwayat selesai</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {assignment.units?.name && (
                                  <span className="bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> {assignment.units.name}
                                  </span>
                                )}
                                {assignment.classes?.name && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                                    Kelas: {assignment.classes.name}
                                  </span>
                                )}
                                {assignment.subject && (
                                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> {assignment.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {assignment.is_active !== false ? <button
                            onClick={() => {
                              if (confirm(`Akhiri penugasan "${roleInfo.label}"? Riwayatnya tetap disimpan.`)) {
                                updateAssignment(
                                  { resource: "teacher_assignments", id: assignment.id, values: { is_active: false }, successNotification: () => ({ message: "Penugasan diakhiri", type: "success" }) },
                                  { onSuccess: () => refetchAssignments() }
                                );
                              }
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Akhiri penugasan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
                {record.position === "guru_quran" ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    Penanggung jawab kelompok Al-Qur'an dikelola langsung melalui <Link to="/tahfidz-halaqohs" className="font-semibold underline">Halaqoh Tahfidz</Link> atau <Link to="/tahsin-halaqohs" className="font-semibold underline">Halaqoh Tahsin</Link>, agar siswa dan targetnya ikut tersambung.
                  </div>
                ) : null}
                </section>

                <section className="border-t pt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-base">Jadwal Kerja dan Mengajar</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Hari dan jam pelaksanaan yang muncul pada portal serta dipakai pemeriksaan presensi.</p>
                    </div>
                    <Link to={`/schedules/create?employee_id=${record.id}&unit_id=${record.unit_id || "__cross_unit__"}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
                      <Plus className="h-4 w-4" /> Tambah Jadwal
                    </Link>
                  </div>
                  {schedulesLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : schedules.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-7 text-center">
                      <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm font-medium">Belum ada jadwal pada periode aktif.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {schedules.map((schedule) => (
                        <div key={schedule.id} className="rounded-lg border bg-background p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{schedule.day_of_week}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</p>
                            </div>
                            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold">{formatScheduleType(schedule.schedule_type)}</span>
                          </div>
                          {schedule.subject ? <p className="mt-2 truncate text-xs font-medium text-primary">{schedule.subject}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── Tab: Presensi ── */}
            {activeTab === "attendance" && (
              <div className="p-5">
                <h3 className="font-semibold text-base mb-4">Riwayat Presensi</h3>
                <div className="bg-muted/20 border border-dashed rounded-xl p-10 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">Data Presensi</p>
                  <p className="text-xs text-muted-foreground">
                    Lihat riwayat lengkap di halaman{" "}
                    <Link to="/attendance/employees" className="text-primary hover:underline font-medium">
                      Presensi Pegawai
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* ── Tab: Cuti ── */}
            {activeTab === "leaves" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">Riwayat Pengajuan Cuti</h3>
                  <Link
                    to="/leaves/create"
                    className="flex items-center gap-1.5 text-sm font-medium border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajukan Cuti
                  </Link>
                </div>
                {leavesLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
                  </div>
                ) : (leavesData?.data ?? []).length === 0 ? (
                  <div className="bg-muted/20 border border-dashed rounded-xl p-10 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">Belum ada riwayat cuti.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(leavesData?.data ?? []).map((leave) => {
                      const statusColor =
                        leave.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        leave.status === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800";
                      return (
                        <div key={leave.id} className="border rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{leave.leave_type ?? "Cuti"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {leave.start_date && new Date(leave.start_date).toLocaleDateString("id-ID")}
                              {leave.end_date && ` – ${new Date(leave.end_date).toLocaleDateString("id-ID")}`}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>
                            {leave.status ?? "pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Dokumen ── */}
            {activeTab === "documents" && (
              <div className="p-5">
                <h3 className="font-semibold text-base mb-4">Dokumen Kepegawaian</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["SK / Kontrak", "Dasar pengangkatan, masa kerja, dan status pegawai."],
                    ["Ijazah & Sertifikat", "Validasi kualifikasi akademik, tahsin/tahfidz, dan kompetensi."],
                    ["PKG & Supervisi", "Ringkasan evaluasi kinerja, tindak lanjut, dan pembinaan."],
                    ["Administrasi Wajib", "KTP, NPWP, rekening, dan dokumen internal sekolah."],
                  ].map(([title, description]) => (
                    <div key={title} className="border rounded-xl p-4 bg-background">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah Penugasan */}
      <AssignmentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeId={record?.id as string}
        employeePosition={record.position}
        defaultUnitId={record.unit_id}
        activeYearId={activeYearId ?? undefined}
        activeSemesterId={activeSemesterId ?? undefined}
        onSuccess={() => refetchAssignments()}
      />
    </div>
  );
};
