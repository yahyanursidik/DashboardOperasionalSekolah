import React from "react";
import { useShow, useList, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { 
  User, Edit, ArrowLeft, Phone, Mail, MapPin, GraduationCap, 
  Users, Briefcase, CreditCard, BookOpen, Heart, Map, ExternalLink, Trash2, Loader2, AlertTriangle,
  ShieldCheck, Link2, MessageSquare, ClipboardCheck, Receipt, Megaphone, UserCheck, Wallet
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getParentQualitySummary } from "./list";
import { supabaseClient } from "../../../lib/supabase/client";

// ─── Modal Konfirmasi Lokal ──────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Profil Orang Tua?</h4>
            <p className="text-sm text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan. Menghapus data ini mungkin akan berdampak pada tautan data siswa yang terhubung.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md font-semibold transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatWhatsAppNumber = (phone: string) => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.substring(1);
  return cleaned;
};

function getInitials(name: string) {
  if (!name) return "?";
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
  for (let i = 0; i < (name || "").length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] || AVATAR_COLORS[0];
}

// ─── Components ──────────────────────────────────────────────────────────────
const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | null | undefined }) => (
  <div className="flex gap-3 items-start">
    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const ParentShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();

  const record = data?.data;
  const avatarColor = getAvatarColor(record?.full_name ?? "");

  // Delete State
  const { mutate: deleteParent } = useDelete();
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    if (!record?.id) return;
    setIsDeleting(true);
    deleteParent(
      { resource: "parents", id: record.id },
      {
        onSuccess: () => {
          toast.success("Data orang tua berhasil dihapus");
          navigate("/parents");
        },
        onError: () => toast.error("Gagal menghapus data orang tua"),
        onSettled: () => setIsDeleting(false)
      }
    );
  };

  // Fetch linked children
  const { data: childrenData, isLoading: childrenLoading, refetch: refetchChildren } = useList({
    resource: "student_parent_links",
    filters: [
      { field: "parent_id", operator: "eq", value: record?.id }
    ],
    meta: {
      select: "*, students(*, classes(name))"
    },
    queryOptions: { enabled: !!record?.id }
  });

  const studentIds = childrenData?.data?.map((link: any) => link.student_id) || [];

  // Fetch spouse (other parent of the same children)
  const { data: spouseLinksData } = useList({
    resource: "student_parent_links",
    filters: [
      { field: "student_id", operator: "in", value: studentIds.length > 0 ? studentIds : ["empty"] },
      { field: "parent_id", operator: "ne", value: record?.id }
    ],
    meta: {
      select: "*, parents(*)"
    },
    queryOptions: { enabled: studentIds.length > 0 }
  });

  const spouseLink = spouseLinksData?.data?.find((l: any) => l.parents);
  const spouse = spouseLink?.parents;
  const linkedChildrenCount = childrenData?.data?.length || 0;
  const quality = getParentQualitySummary(record || {}, linkedChildrenCount);
  const portalChildrenCount = childrenData?.data?.filter((link: any) => link.can_access_parent_portal !== false).length || 0;

  const togglePortalAccess = async (linkId: string, currentlyEnabled: boolean) => {
    const { error } = await supabaseClient
      .from("student_parent_links")
      .update({ can_access_parent_portal: !currentlyEnabled })
      .eq("id", linkId);
    if (error) {
      console.error("Parent portal access update error:", error);
      toast.error("Akses portal belum berhasil diperbarui.");
      return;
    }
    toast.success(currentlyEnabled ? "Akses portal untuk siswa dinonaktifkan." : "Akses portal untuk siswa diaktifkan.");
    refetchChildren();
  };

  const { data: invoicesData, isLoading: invoicesLoading } = useList({
    resource: "student_invoices",
    filters: [
      { field: "student_id", operator: "in", value: studentIds.length > 0 ? studentIds : ["empty"] }
    ],
    meta: { select: "id, student_id, title, amount, discount, paid_amount, status, due_date, students(full_name)" },
    pagination: { pageSize: 100 },
    queryOptions: { enabled: studentIds.length > 0 }
  });

  const activeChildrenCount = childrenData?.data?.filter((link: any) => link.students?.status === "active").length || 0;
  const primaryChildrenCount = childrenData?.data?.filter((link: any) => link.is_primary).length || 0;
  const openInvoices = (invoicesData?.data || []).filter((invoice: any) => invoice.status !== "paid");
  const outstandingAmount = openInvoices.reduce((sum: number, invoice: any) => {
    const amount = Number(invoice.amount || 0);
    const discount = Number(invoice.discount || 0);
    const paid = Number(invoice.paid_amount || 0);
    return sum + Math.max(amount - discount - paid, 0);
  }, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(record?.address || "Jakarta")}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Memuat profil orang tua...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border">
        Data orang tua tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Profil Orang Tua / Wali"
        description="Detail identitas, informasi kontak, dan data tanggungan siswa."
        action={
          <button
            onClick={() => navigate("/parents")}
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-lg hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        }
      />

      {/* ── 1. Hero Section ── */}
      <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Accent */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${avatarColor} opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none`} />

        <div className="flex items-center gap-5 z-10 w-full md:w-auto">
          <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-2xl md:text-3xl shrink-0 shadow-lg ring-4 ring-white`}>
            {getInitials(record.full_name)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{record.full_name}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${record.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {record.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-muted-foreground font-medium text-sm flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4" /> {record.occupation || "Pekerjaan belum diatur"}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-medium text-muted-foreground border">
                <CreditCard className="w-3.5 h-3.5" /> NIK: {record.nik || "-"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-medium text-muted-foreground border">
                <Heart className="w-3.5 h-3.5" /> Agama: {record.religion || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto z-10 shrink-0">
          {record.phone && formatWhatsAppNumber(record.phone) && (
            <a 
              href={`https://wa.me/${formatWhatsAppNumber(record.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2.5 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
            >
              <Phone className="w-4 h-4" /> WhatsApp
            </a>
          )}
          {record.email && (
            <a 
              href={`mailto:${record.email}`}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
          <button
            onClick={() => {
              if (linkedChildrenCount > 0) {
                toast.error("Lepaskan tautan siswa terlebih dahulu sebelum menghapus profil wali.");
                return;
              }
              setDeleteConfirmId(record?.id as string);
            }}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg hover:bg-red-100 transition-colors shadow-sm font-medium text-sm"
          >
            <Trash2 className="w-4 h-4" /> Hapus Profil
          </button>
          <Link
            to={`/parents/edit/${record.id}`}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Edit className="w-4 h-4" /> Edit Profil
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: "Mutu Kontak",
            value: `${quality.score}%`,
            helper: quality.ready ? "Siap komunikasi wali" : "Perlu dilengkapi",
            icon: ShieldCheck,
            tone: quality.ready ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100",
          },
          {
            label: "Anak Tertaut",
            value: linkedChildrenCount,
            helper: linkedChildrenCount > 0 ? "Relasi siswa tersedia" : "Belum tertaut ke siswa",
            icon: Link2,
            tone: linkedChildrenCount > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-rose-50 text-rose-700 border-rose-100",
          },
          {
            label: "WhatsApp",
            value: quality.hasPhone ? "Ada" : "Kosong",
            helper: quality.hasPhone ? "Bisa dihubungi" : "Isi nomor aktif",
            icon: MessageSquare,
            tone: quality.hasPhone ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-amber-50 text-amber-700 border-amber-100",
          },
          {
            label: "Status",
            value: record.is_active ? "Aktif" : "Nonaktif",
            helper: record.is_active ? "Masuk komunikasi aktif" : "Tidak diprioritaskan",
            icon: User,
            tone: record.is_active ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-700 border-slate-200",
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

      {quality.missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3">
          <ClipboardCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Prioritas perbaikan data wali</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {quality.missing.map((item) => (
                <span key={item} className="text-xs font-medium px-2 py-1 rounded-md bg-white text-amber-800 border border-amber-100">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Ringkasan Operasional Keluarga
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sinyal cepat untuk wali kelas, tata usaha, bendahara, dan admin portal orang tua.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/announcements/create" className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                <Megaphone className="w-4 h-4" />
                Buat Pengumuman
              </Link>
              <Link to="/finance/invoices" className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                <Receipt className="w-4 h-4" />
                Cek Tagihan
              </Link>
              <Link to="/students" className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                <GraduationCap className="w-4 h-4" />
                Data Siswa
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            {[
              {
                label: "Anak Aktif",
                value: activeChildrenCount,
                helper: `${linkedChildrenCount} total tertaut`,
                icon: GraduationCap,
                tone: activeChildrenCount > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-700 border-slate-200",
              },
              {
                label: "Kontak Utama",
                value: primaryChildrenCount,
                helper: primaryChildrenCount > 0 ? "Ditandai pada relasi siswa" : "Belum ada penanda utama",
                icon: UserCheck,
                tone: primaryChildrenCount > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100",
              },
              {
                label: "Tagihan Terbuka",
                value: invoicesLoading ? "-" : openInvoices.length,
                helper: outstandingAmount > 0 ? formatCurrency(outstandingAmount) : "Tidak ada saldo",
                icon: Wallet,
                tone: openInvoices.length === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100",
              },
              {
                label: "Pasangan",
                value: spouse ? "Ada" : "Kosong",
                helper: spouse ? spouse.full_name : "Belum terdeteksi dari anak yang sama",
                icon: Users,
                tone: spouse ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-muted/40 text-muted-foreground border-border",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-lg border p-4 ${item.tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</p>
                      <p className="text-xl font-bold mt-1 truncate">{item.value}</p>
                    </div>
                    <Icon className="w-5 h-5 opacity-80 shrink-0" />
                  </div>
                  <p className="text-xs mt-2 opacity-80 line-clamp-2">{item.helper}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <h3 className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Kesiapan Portal Wali
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: "Nomor WhatsApp aktif", ok: quality.hasPhone },
              { label: "Email alternatif", ok: quality.hasEmail, optional: true },
              { label: "Terhubung ke siswa", ok: linkedChildrenCount > 0 },
              { label: "Akses portal anak", ok: portalChildrenCount > 0 },
              { label: "Status wali aktif", ok: Boolean(record.is_active) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.ok ? "bg-emerald-50 text-emerald-700" : item.optional ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-700"}`}>
                  {item.ok ? "Siap" : item.optional ? "Opsional" : "Kurang"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            Portal wali membutuhkan relasi siswa dan kontak yang valid agar orang tua bisa menerima informasi akademik, tagihan, dan pengumuman.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Data Pribadi Lengkap */}
          <div className="bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden">
            <h3 className="font-bold text-lg border-b pb-4 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Informasi Lengkap
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <InfoItem icon={CreditCard} label="Nomor Induk Kependudukan (NIK)" value={record.nik} />
              <InfoItem icon={Briefcase} label="Pekerjaan / Profesi" value={record.occupation} />
              <InfoItem icon={Phone} label="Nomor Handphone" value={record.phone} />
              <InfoItem icon={Mail} label="Alamat Email" value={record.email} />
              <InfoItem icon={BookOpen} label="Pendidikan Terakhir" value={record.education} />
              <InfoItem icon={Heart} label="Agama" value={record.religion} />
            </div>
          </div>

          {/* Alamat & Maps */}
          <div className="bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden">
            <h3 className="font-bold text-lg border-b pb-4 mb-5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" /> Lokasi Domisili
            </h3>
            <p className="text-sm text-foreground font-medium mb-4 p-4 bg-muted/30 rounded-lg border">
              {record.address || "Alamat lengkap belum diisi."}
            </p>
            <div className="w-full h-64 rounded-xl overflow-hidden border bg-muted/20 relative group">
              <iframe 
                src={mapUrl} 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Alamat"
                className="absolute inset-0"
              ></iframe>
              <div className="absolute inset-0 bg-black/0 pointer-events-none group-hover:bg-black/5 transition-colors" />
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Kartu Pasangan (Spouse) */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/30 rounded-2xl border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
            <h3 className="font-bold text-lg pb-4 mb-4 flex items-center justify-between border-b border-indigo-100">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> Data Pasangan
              </span>
            </h3>
            
            {spouse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(spouse.full_name)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                    {getInitials(spouse.full_name)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{spouse.full_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{spouse.occupation || "Pekerjaan belum diisi"}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{spouse.phone || "-"}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/parents/show/${spouse.id}`)}
                  className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Lihat Profil Pasangan
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-indigo-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ditemukan data suami/istri yang terkait dengan anak yang sama.</p>
              </div>
            )}
          </div>

          {/* Kartu Tanggungan (Anak) */}
          <div className="bg-card rounded-2xl border shadow-sm p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> Tanggungan (Siswa)
            </h3>
            
            {childrenLoading ? (
              <div className="space-y-3">
                <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : childrenData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Belum ada anak yang ditautkan.</p>
                <p className="text-xs text-muted-foreground mt-1">Anda dapat menautkan orang tua ini langsung dari halaman Edit Siswa.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {childrenData?.data?.map((link: any) => {
                  const student = link.students;
                  const relations: Record<string, string> = { father: "Ayah", mother: "Ibu", guardian: "Wali" };
                  return (
                    <div 
                      key={link.id} 
                      className="border border-muted-foreground/10 rounded-xl p-4 flex gap-4 hover:border-primary/40 hover:shadow-sm hover:bg-primary/5 transition-all cursor-pointer group" 
                      onClick={() => navigate(`/students/show/${student.id}`)}
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                        {getInitials(student.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground mb-2 mt-0.5">NIS: {student.nis || "-"} • Kelas: {student.classes?.name || "-"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded border">
                            {relations[link.relationship] || link.relationship}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${student.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                            {student.status === "active" ? "Aktif" : student.status || "Status kosong"}
                          </span>
                          {link.is_primary && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500" /> Utama
                            </span>
                          )}
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${link.can_access_parent_portal !== false ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            Portal {link.can_access_parent_portal !== false ? "aktif" : "nonaktif"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/students/show/${student.id}`);
                            }}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Profil siswa
                          </button>
                          <Link
                            to="/finance/invoices"
                            onClick={(event) => event.stopPropagation()}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Tagihan
                          </Link>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void togglePortalAccess(link.id, link.can_access_parent_portal !== false);
                            }}
                            className={`text-[11px] font-medium hover:underline ${link.can_access_parent_portal !== false ? "text-red-600" : "text-emerald-700"}`}
                          >
                            {link.can_access_parent_portal !== false ? "Nonaktifkan portal" : "Aktifkan portal"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

const Star = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
