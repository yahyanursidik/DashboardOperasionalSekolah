import React, { useState } from "react";
import { useShow, useList, useCreate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  User,
  Edit,
  ArrowLeft,
  Users,
  Plus,
  X,
  BookOpen,
  Star,
  AlertTriangle,
  ShieldAlert,
  Award,
  Activity,
  Eye,
  GraduationCap,
  History,
  Bookmark,
  CheckSquare,
  HeartPulse,
  PhoneCall,
  Trash2,
  Loader2,
  ShieldCheck,
  School,
  UserCheck,
  CalendarCheck,
  Receipt,
  FileText,
  MapPin,
  IdCard,
} from "lucide-react";
import { AuditHistory } from "../../../components/common/AuditHistory";
import { Link, useNavigate } from "react-router-dom";
import { calculateCompleteness, getStudentQualitySummary } from "./list";
import { ParentForm } from "../../parents/components/parent-form";
import { AcademicHistoryModal } from "../components/AcademicHistoryModal";
import { toast } from "sonner";

const UnlinkConfirmModal: React.FC<{
  isOpen: boolean;
  parentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, parentName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Hapus Tautan Orang Tua?</h3>
          <p className="text-muted-foreground text-sm">
            Apakah Anda yakin ingin menghapus tautan dengan <span className="font-semibold text-foreground">{parentName}</span>? Data orang tua tetap ada, namun tidak lagi berelasi dengan siswa ini.
          </p>
        </div>
        <div className="flex bg-muted/30 p-4 border-t gap-3 justify-end">
          <button onClick={onCancel} disabled={isDeleting} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Hapus Tautan
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentShow: React.FC = () => {
  const { queryResult } = useShow({
    meta: { select: "*, units(name), classes(name)" }
  });
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();
  const record = data?.data;

  // Parents data
  const { data: parentsData, isLoading: parentsLoading, refetch: refetchParents } = useList({
    resource: "student_parent_links",
    filters: [
      { field: "student_id", operator: "eq", value: record?.id }
    ],
    meta: { select: "*, parents(*)" },
    queryOptions: { enabled: !!record?.id }
  });

  // Journals data
  const { data: journalsData, isLoading: journalsLoading } = useList({
    resource: "student_journals",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "date_recorded", order: "desc" }],
    queryOptions: { enabled: !!record?.id }
  });

  const { data: semestersData } = useList({
    resource: "semesters",
    meta: { select: "*, academic_years(name)" },
    pagination: { mode: "off" }
  });

  // Academic History
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useList({
    resource: "student_academic_history",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    meta: { select: "*, units(name), classes(name), academic_years(name)" },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: !!record?.id }
  });

  // Quran data
  const { data: quranData, isLoading: quranLoading } = useList({
    resource: "quran_records",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, employees(full_name)" },
    queryOptions: { enabled: !!record?.id }
  });

  // PAUD STPPA data
  const { data: stppaData, isLoading: stppaLoading } = useList({
    resource: "paud_stppa_assessments",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "date", order: "desc" }],
    meta: { select: "*, employees(full_name)" },
    queryOptions: { enabled: !!record?.id && record?.units?.name?.toLowerCase().includes("paud") }
  });

  const { data: attendanceData } = useList({
    resource: "attendance_records",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "attendance_date", order: "desc" }],
    pagination: { pageSize: 60 },
    queryOptions: { enabled: !!record?.id }
  });

  const { data: invoicesData } = useList({
    resource: "student_invoices",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "due_date", order: "desc" }],
    meta: { select: "*, finance_categories(name)" },
    pagination: { pageSize: 50 },
    queryOptions: { enabled: !!record?.id }
  });

  const { data: reportCardsData } = useList({
    resource: "academic_report_cards",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    pagination: { pageSize: 20 },
    queryOptions: { enabled: !!record?.id }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [linkMode, setLinkMode] = useState<"existing" | "new">("new");
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<"parents" | "health" | "academic" | "journals">("parents");

  // Unlink State
  const { mutate: deleteMutate, isLoading: isUnlinking } = useDelete();
  const [unlinkModal, setUnlinkModal] = useState<{ isOpen: boolean; linkId: string; parentName: string }>({ isOpen: false, linkId: "", parentName: "" });

  // Link mutation
  const { mutate: createLink, isLoading: isLinking } = useCreate();

  // If the parent form was modified to return the inserted data, we could auto-link.
  // For now, after creating a parent, we close the form and ask user to link existing.

  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationship, setRelationship] = useState("father");
  const [isPrimary, setIsPrimary] = useState(false);

  // Existing parents query for linking
  const { data: allParentsData } = useList({
    resource: "parents",
    queryOptions: { enabled: linkMode === "existing" && isModalOpen }
  });

  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) return;

    createLink({
      resource: "student_parent_links",
      values: {
        student_id: record?.id,
        parent_id: selectedParentId,
        relationship: relationship,
        is_primary: isPrimary,
        can_access_parent_portal: true,
      },
      successNotification: () => ({ message: "Orang Tua Berhasil Ditautkan", type: "success" })
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        refetchParents();
        setSelectedParentId("");
      }
    });
  };

  const handleUnlink = () => {
    if (!unlinkModal.linkId) return;
    deleteMutate(
      { resource: "student_parent_links", id: unlinkModal.linkId },
      {
        onSuccess: () => {
          toast.success("Tautan orang tua berhasil dihapus.");
          setUnlinkModal({ isOpen: false, linkId: "", parentName: "" });
          refetchParents();
        },
        onError: (error) => {
          toast.error("Gagal menghapus tautan: " + error.message);
        }
      }
    );
  };

  const handleHistorySaved = () => {
    refetchHistory();
    // also refetch student data to get new class_id
    queryResult.refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Siswa tidak ditemukan.</div>;
  }

  const score = calculateCompleteness(record);
  const profileQuality = getStudentQualitySummary(record, (parentsData?.data?.length || 0) > 0);
  const todayIso = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const attendanceRecords = attendanceData?.data || [];
  const currentMonthAttendance = attendanceRecords.filter((item: any) => {
    const rawDate = item.attendance_date || item.date;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const presentStatuses = ["present", "hadir", "late", "terlambat"];
  const presentCount = currentMonthAttendance.filter((item: any) =>
    presentStatuses.includes(String(item.status || "").toLowerCase())
  ).length;
  const attendanceRate = currentMonthAttendance.length > 0
    ? Math.round((presentCount / currentMonthAttendance.length) * 100)
    : null;
  const unpaidInvoices = (invoicesData?.data || []).filter((invoice: any) => invoice.status !== "paid");
  const outstandingAmount = unpaidInvoices.reduce((sum: number, invoice: any) => {
    const amount = Number(invoice.amount || 0);
    const discount = Number(invoice.discount || 0);
    const paid = Number(invoice.paid_amount || 0);
    return sum + Math.max(amount - discount - paid, 0);
  }, 0);
  const latestQuranRecord = quranData?.data?.[0];
  const latestJournal = journalsData?.data?.[0];
  const latestHistory = historyData?.data?.[0];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getCategoryDetails = (category: string) => {
    switch(category) {
      case 'akademik': return { icon: <BookOpen className="w-4 h-4" />, label: 'Akademik', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'karakter': return { icon: <Star className="w-4 h-4" />, label: 'Karakter', color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'kendala': return { icon: <AlertTriangle className="w-4 h-4" />, label: 'Kendala', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'ekskul': return { icon: <Award className="w-4 h-4" />, label: 'Ekskul', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'kasus': return { icon: <ShieldAlert className="w-4 h-4" />, label: 'Kasus', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'kesehatan': return { icon: <Activity className="w-4 h-4" />, label: 'Kesehatan', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'anekdot': return { icon: <Eye className="w-4 h-4" />, label: 'Anekdot', color: 'text-teal-600 bg-teal-50 border-teal-200' };
      case 'stppa': return { icon: <Star className="w-4 h-4 fill-current" />, label: 'STPPA', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      default: return { icon: <BookOpen className="w-4 h-4" />, label: category, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Siswa"
        description={`Rekam jejak dan data induk untuk ${record.full_name}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/students")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/students/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Ubah Data
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-sm mb-4 overflow-hidden">
              {record.photo_url ? (
                <img 
                  src={record.photo_url.startsWith('http') ? record.photo_url : `https://ebdkupeqmpqrdfketgab.supabase.co/storage/v1/object/public/school-documents/${record.photo_url}`} 
                  alt={record.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-12 h-12 text-primary/50" />
              )}
            </div>
            <h2 className="text-xl font-bold">{record.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Panggilan: {record.nickname || "-"}</p>
            {(() => {
              const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
                active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Aktif" },
                inactive: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", label: "Nonaktif" },
                graduated: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", label: "Lulus" },
                transferred: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Pindah" },
                dropped_out: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", label: "Dikeluarkan" },
              };
              const style = styles[record.status] || styles.active;
              return (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border mb-6 ${style.bg} ${style.text} ${style.border}`}>
                  <div className={`w-2 h-2 rounded-full ${style.dot} ${record.status === 'active' ? 'animate-pulse' : ''}`} />
                  Status: {style.label}
                </div>
              );
            })()}
            <div className="mt-2 pt-4 border-t">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="font-medium">Kelengkapan Data</span>
                <span className={`font-bold ${score === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{score}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full ${score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${score}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">Kesiapan Operasional</h3>
                <p className="text-xs text-muted-foreground mt-1">Sinyal cepat untuk absensi, rapor, portal wali, dan kelas.</p>
              </div>
              <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                profileQuality.ready
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {profileQuality.ready ? "Siap" : "Perlu Dilengkapi"}
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Identitas dasar", ok: profileQuality.hasIdentity, icon: ShieldCheck },
                { label: "Terhubung ke kelas", ok: profileQuality.hasClass, icon: School },
                { label: "Kontak orang tua/wali", ok: profileQuality.hasGuardianContact, icon: UserCheck },
                { label: "Alamat domisili", ok: profileQuality.hasAddress, icon: Users },
                { label: "Catatan kesehatan terpantau", ok: profileQuality.hasHealthAttention, icon: HeartPulse, neutral: true },
              ].map((item) => {
                const Icon = item.icon;
                const isNeutralMissing = item.neutral && !item.ok;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${item.ok ? "text-emerald-600" : isNeutralMissing ? "text-muted-foreground" : "text-amber-600"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : isNeutralMissing
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-50 text-amber-700"
                    }`}>
                      {item.ok ? "Ada" : isNeutralMissing ? "Tidak ada catatan" : "Kurang"}
                    </span>
                  </div>
                );
              })}
            </div>
            {profileQuality.missing.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prioritas perbaikan</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileQuality.missing.map((item) => (
                    <span key={item} className="text-[11px] font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
              <Link to={`/students/edit/${record.id}`} className="text-center text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                Lengkapi Data
              </Link>
              <button onClick={() => setIsModalOpen(true)} className="text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                Tautkan Wali
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <IdCard className="w-4 h-4 text-primary" />
              Identitas & Sekolah
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "NIS", value: record.nis || "-" },
                { label: "NISN", value: record.nisn || "-" },
                { label: "Unit", value: record.units?.name || "-" },
                { label: "Kelas", value: record.classes?.name || "Belum ada kelas" },
                { label: "L/P", value: record.gender === "L" ? "Ikhwan (L)" : record.gender === "P" ? "Akhawat (P)" : "-" },
                { label: "Tempat/Tgl Lahir", value: `${record.birth_place || "-"} / ${formatDate(record.date_of_birth)}` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right">{item.value}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Alamat
                </p>
                <p className="font-medium leading-relaxed">{record.address || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold mb-4">Akses Cepat</h3>
            <div className="grid grid-cols-2 gap-2">
              {record.class_id ? (
                <Link to={`/attendance/class/${record.class_id}?date=${todayIso}`} className="text-center text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                  Absensi Kelas
                </Link>
              ) : (
                <span className="text-center text-xs font-medium px-3 py-2 border rounded-md text-muted-foreground bg-muted/30">
                  Absensi Kelas
                </span>
              )}
              <Link to={`/student-journals/create?student_id=${record.id}&class_id=${record.class_id || ""}`} className="text-center text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                Tulis Jurnal
              </Link>
              <Link to={`/quran/create?student_id=${record.id}&class_id=${record.class_id || ""}`} className="text-center text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                Catat Qur'an
              </Link>
              <Link to="/finance/invoices" className="text-center text-xs font-medium px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                Tagihan
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: "Kehadiran Bulan Ini",
                value: attendanceRate === null ? "-" : `${attendanceRate}%`,
                helper: `${currentMonthAttendance.length} catatan absensi`,
                icon: CalendarCheck,
                tone: attendanceRate === null || attendanceRate >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100",
              },
              {
                label: "Tagihan Terbuka",
                value: unpaidInvoices.length,
                helper: outstandingAmount > 0 ? formatCurrency(outstandingAmount) : "Tidak ada saldo",
                icon: Receipt,
                tone: unpaidInvoices.length === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100",
              },
              {
                label: "Jurnal Siswa",
                value: journalsData?.data?.length || 0,
                helper: latestJournal ? `Terakhir ${formatDate(latestJournal.date_recorded)}` : "Belum ada catatan",
                icon: FileText,
                tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
              },
              {
                label: "Mutaba'ah Qur'an",
                value: quranData?.data?.length || 0,
                helper: latestQuranRecord ? `${latestQuranRecord.record_type || "Catatan"} terakhir ${formatDate(latestQuranRecord.date)}` : "Belum ada catatan",
                icon: Bookmark,
                tone: "bg-teal-50 text-teal-700 border-teal-100",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-lg border p-4 ${item.tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</p>
                      <p className="text-2xl font-bold mt-1">{item.value}</p>
                    </div>
                    <Icon className="w-5 h-5 opacity-80" />
                  </div>
                  <p className="text-xs mt-2 opacity-80">{item.helper}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div>
                <h3 className="font-semibold">Ringkasan Mutu Profil</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {latestHistory
                    ? `Riwayat terakhir: ${latestHistory.status} - ${latestHistory.classes?.name || "tanpa kelas"}`
                    : "Belum ada riwayat akademik tercatat untuk siswa ini."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {parentsData?.data?.length || 0} wali terhubung
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {historyData?.data?.length || 0} riwayat akademik
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {reportCardsData?.data?.length || 0} rapor tersimpan
                </span>
              </div>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex border-b overflow-x-auto hide-scrollbar bg-card rounded-t-xl">
            <button
              onClick={() => setActiveTab("parents")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "parents" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Users className="w-4 h-4" /> Orang Tua & Kontak
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{parentsData?.data?.length || 0}</span>
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "health" ? "border-rose-500 text-rose-600" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <HeartPulse className="w-4 h-4" /> Medis & Kesehatan
              {profileQuality.hasHealthAttention && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700">Perlu pantau</span>}
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "academic" ? "border-emerald-500 text-emerald-600" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <History className="w-4 h-4" /> Akademik & Kelas
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{historyData?.data?.length || 0}</span>
            </button>
            <button
              onClick={() => setActiveTab("journals")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "journals" ? "border-indigo-500 text-indigo-600" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Jurnal & Rekam Jejak
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{(journalsData?.data?.length || 0) + (quranData?.data?.length || 0)}</span>
            </button>
          </div>

          {/* TAB CONTENT: PARENTS & CONTACT */}
          {activeTab === "parents" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-card rounded-xl rounded-tl-none border shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Orang Tua / Wali
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-sm flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tautkan Orang Tua
              </button>
            </div>
            
            {parentsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data orang tua...</p>
            ) : parentsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada orang tua yang ditautkan ke profil ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentsData?.data?.map((link: any) => {
                  const parent = link.parents;
                  const relations: Record<string, string> = { father: "Ayah", mother: "Ibu", guardian: "Wali" };
                  return (
                    <div key={link.id} className="border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/parents/show/${parent.id}`)}>
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{parent.full_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">{parent.phone || "Tidak ada No. HP"}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-full">
                            Sebagai: {relations[link.relationship] || link.relationship}
                          </span>
                          {link.is_primary && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Kontak Utama
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); setUnlinkModal({ isOpen: true, linkId: link.id, parentName: parent.full_name }); }}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus Tautan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </div>
          )}

          {/* TAB CONTENT: HEALTH */}
          {activeTab === "health" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card rounded-xl border shadow-sm p-6 border-orange-200">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 border-b pb-4 text-rose-900">
              <HeartPulse className="w-5 h-5 text-rose-600" /> Data Kesehatan & Medis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Golongan Darah</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {record.blood_type || "-"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Alergi Makanan / Obat</p>
                <p className="font-medium">{record.allergies || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Riwayat Penyakit Menahun</p>
                <p className="font-medium">{record.medical_history || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Kebutuhan Khusus / Disabilitas</p>
                <p className="font-medium">{record.special_needs || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Riwayat & Catatan UKS</p>
                <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {record.uks_history || "Tidak ada riwayat medis di sekolah."}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6 border-orange-200">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 border-b pb-4 text-orange-900">
              <PhoneCall className="w-5 h-5 text-orange-600" /> Kontak Darurat Khusus
            </h3>
            {record.emergency_contact_name || record.emergency_contact_phone ? (
              <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-orange-950">{record.emergency_contact_name || "Tanpa Nama"}</p>
                  <p className="text-orange-800 font-medium font-mono mt-0.5">{record.emergency_contact_phone || "-"}</p>
                </div>
                <div className="ml-auto">
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold uppercase px-3 py-1 rounded-full">
                    Hubungan: {record.emergency_contact_relation || "-"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">Tidak ada kontak darurat tambahan yang didaftarkan.</p>
              </div>
            )}
          </div>
            </div>
          )}

          {/* TAB CONTENT: ACADEMIC */}
          {activeTab === "academic" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Riwayat Akademik & Kelas
              </h3>
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-sm flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Catat Riwayat / Pindah
              </button>
            </div>
            
            {historyLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat riwayat...</p>
            ) : historyData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada riwayat akademik untuk siswa ini.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-muted ml-3 space-y-6">
                {historyData?.data?.map((history: any, index: number) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  if (history.status === 'Naik Kelas') badgeColor = "bg-emerald-100 text-emerald-700";
                  else if (history.status === 'Pindah Jenjang') badgeColor = "bg-purple-100 text-purple-700";
                  else if (history.status === 'Siswa Baru' || history.status === 'Pindahan (Masuk)') badgeColor = "bg-blue-100 text-blue-700";
                  else if (history.status === 'Lulus') badgeColor = "bg-amber-100 text-amber-700";
                  else if (history.status === 'Tinggal Kelas') badgeColor = "bg-rose-100 text-rose-700";
                  
                  return (
                    <div key={history.id} className="relative pl-6">
                      <div className={`absolute w-3 h-3 rounded-full -left-[7px] top-1.5 border-2 border-white ${index === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {history.status}
                            </span>
                            <h4 className="font-semibold text-sm mt-1">{history.units?.name} - {history.classes?.name || "Lulus/Keluar"}</h4>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded border">
                            TA {history.academic_years?.name || "-"}
                          </span>
                        </div>
                        {history.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{history.notes}"</p>}
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          Dibuat pada {new Date(history.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
          )}

          {/* TAB CONTENT: JOURNALS */}
          {activeTab === "journals" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-card rounded-xl rounded-tl-none border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Jurnal & Rekam Jejak
              </h3>
              <Link 
                to={`/student-journals/create?student_id=${record.id}&class_id=${record.class_id || ""}`}
                className="text-sm flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tulis Jurnal
              </Link>
            </div>
            
            {journalsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat rekam jejak...</p>
            ) : journalsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada catatan jurnal atau rekam jejak untuk siswa ini.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  // Group journals by Semester & Year
                  const grouped: Record<string, { yearName: string; semesterName: string; items: any[] }> = {};
                  
                  journalsData?.data?.forEach(journal => {
                    let groupKey = "Lainnya";
                    let yearName = "Lainnya";
                    let semesterName = "";

                    if (semestersData?.data) {
                      const date = new Date(journal.date_recorded);
                      const semester = semestersData.data.find(s => {
                        return date >= new Date(s.start_date) && date <= new Date(s.end_date);
                      });
                      if (semester) {
                        yearName = semester.academic_years?.name || "Tahun Tidak Diketahui";
                        semesterName = semester.name;
                        groupKey = `TA ${yearName} - Semester ${semesterName}`;
                      }
                    }

                    if (!grouped[groupKey]) {
                      grouped[groupKey] = { yearName, semesterName, items: [] };
                    }
                    grouped[groupKey].items.push(journal);
                  });

                  return Object.entries(grouped).map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-full border border-indigo-100">
                          {groupKey}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          {group.items.length} Catatan
                        </div>
                      </div>
                      
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {group.items.map((journal: any) => {
                          const cat = getCategoryDetails(journal.category);
                          return (
                            <div key={journal.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                {cat.icon}
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-xl border shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cat.color}`}>
                                    {cat.label}
                                  </span>
                                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                    {new Date(journal.date_recorded).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-bold text-foreground text-sm mb-1">{journal.title}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{journal.description}</p>
                                
                                {journal.category === 'stppa' && journal.stppa_metrics && (
                                  <div className="mt-2 mb-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                                    <h5 className="text-[10px] font-bold uppercase text-indigo-800 mb-2">Capaian STPPA:</h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {Object.entries(journal.stppa_metrics).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-indigo-50">
                                          <span className="font-semibold text-indigo-900">{key}</span>
                                          <span className="font-bold text-indigo-600">{String(val)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {journal.action_taken && (
                                  <div className="bg-amber-50 text-amber-800 p-2 rounded text-xs border border-amber-100">
                                    <strong>Tindakan:</strong> {journal.action_taken}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Quran Section */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-600" /> Mutaba'ah Al-Qur'an
              </h3>
            </div>
            {quranLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data Al-Qur'an...</p>
            ) : quranData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada rekam jejak Al-Qur'an untuk siswa ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quranData?.data?.map((q: any) => (
                  <div key={q.id} className="p-4 border rounded-xl hover:border-emerald-200 transition-colors bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${q.record_type === 'tahfidz' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {q.record_type}
                        </span>
                        <span className="text-sm font-semibold">{q.surah_or_jilid}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm mt-3">
                      <div>
                        <span className="text-xs text-muted-foreground block">Ayat/Halaman</span>
                        <span className="font-medium">{q.ayat_or_page}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Kelancaran</span>
                        <span className="font-medium">{q.fluency_score}</span>
                      </div>
                      {q.notes && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Catatan</span>
                          <span className="font-medium">{q.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAUD STPPA Section - Only show if student is in PAUD unit or has PAUD data */}
          {(record?.units?.name?.toLowerCase().includes("paud") || (stppaData?.data?.length ?? 0) > 0) && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-purple-600" /> Rapor STPPA (PAUD)
                </h3>
              </div>
              {stppaLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Memuat data STPPA...</p>
              ) : stppaData?.data?.length === 0 ? (
                <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">Belum ada asesmen STPPA.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stppaData?.data?.map((stppa: any) => (
                    <div key={stppa.id} className="p-4 border rounded-xl bg-purple-50/30">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-purple-800">
                          Asesmen Tanggal: {new Date(stppa.date).toLocaleDateString('id-ID')}
                        </span>
                        <span className="text-xs text-muted-foreground">Oleh: {stppa.employees?.full_name}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Agama & Moral</div>
                          <div className="font-semibold">{stppa.agama_moral}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Fisik Motorik</div>
                          <div className="font-semibold">{stppa.fisik_motorik}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Kognitif</div>
                          <div className="font-semibold">{stppa.kognitif}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Bahasa</div>
                          <div className="font-semibold">{stppa.bahasa}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Sosial Emosional</div>
                          <div className="font-semibold">{stppa.sosial_emosional}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Seni</div>
                          <div className="font-semibold">{stppa.seni}</div>
                        </div>
                      </div>
                      {stppa.narrative_report && (
                        <div className="mt-3 bg-white p-3 rounded border text-sm italic">
                          "{stppa.narrative_report}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>
          )}

          {/* AUDIT */}
          <AuditHistory resource="students" resourceId={record.id as string} />
        </div>
      </div>

      {/* Modals */}
      {isHistoryModalOpen && (
        <AcademicHistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          student={record} 
          onSuccess={handleHistorySaved} 
        />
      )}
      {/* MODAL: Tautkan Orang Tua */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-lg">Tautkan Orang Tua / Wali</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              
              <div className="flex p-1 bg-muted rounded-lg mb-6 w-full max-w-md">
                <button 
                  onClick={() => setLinkMode("new")}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${linkMode === "new" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >Buat Orang Tua Baru</button>
                <button 
                  onClick={() => setLinkMode("existing")}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${linkMode === "existing" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >Pilih yang Sudah Ada</button>
              </div>

              {linkMode === "new" ? (
                <div className="border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-4">Masukkan data orang tua baru. Setelah tersimpan, Anda dapat menautkannya di tab "Pilih yang Sudah Ada".</p>
                  <ParentForm action="create" hideActions={false} />
                </div>
              ) : (
                <form onSubmit={handleLinkExisting} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Orang Tua</label>
                    <select 
                      required 
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">-- Pilih --</option>
                      {allParentsData?.data?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.phone || "Tanpa No. HP"})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hubungan (Status)</label>
                    <select 
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="father">Ayah</option>
                      <option value="mother">Ibu</option>
                      <option value="guardian">Wali</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary" 
                      />
                      <span className="text-sm font-medium">Jadikan Kontak Utama</span>
                    </label>
                    <p className="text-xs text-muted-foreground ml-6">Hanya satu kontak utama per siswa. Menandai ini akan menggeser kontak utama sebelumnya.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Batal</button>
                    <button type="submit" disabled={isLinking} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-70">
                      {isLinking ? "Menautkan..." : "Tautkan Sekarang"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Unlink */}
      <UnlinkConfirmModal
        isOpen={unlinkModal.isOpen}
        parentName={unlinkModal.parentName}
        onConfirm={handleUnlink}
        onCancel={() => setUnlinkModal({ isOpen: false, linkId: "", parentName: "" })}
        isDeleting={isUnlinking}
      />

    </div>
  );
};
