import React, { useState, useMemo } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { useList, useDelete } from "@refinedev/core";
import {
  Eye, Edit, Plus, Search, Users, Phone, LayoutGrid, LayoutList,
  UploadCloud, Download, FileSpreadsheet, UserCheck, Shield, Mail, Briefcase, UserX, Trash2, Loader2, AlertTriangle
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import Papa from "papaparse";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { Modal } from "../../../components/common/Modal";

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
            <h4 className="text-lg font-bold text-foreground mb-2">Hapus Data Orang Tua?</h4>
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
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ParentCard({ parent, onClick, onEdit, onDelete }: { parent: any; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const avatarColor = getAvatarColor(parent.full_name ?? "?");
  const waNumber = formatWhatsAppNumber(parent.phone);

  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
            {getInitials(parent.full_name ?? "?")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight truncate max-w-[150px]">{parent.full_name}</p>
            {parent.occupation && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[150px] truncate">{parent.occupation}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${parent.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
          {parent.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      <div className="space-y-2">
        {parent.phone && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{parent.phone}</span>
            </div>
            {waNumber && (
              <a 
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-green-100 text-green-700 hover:bg-green-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                title="Hubungi via WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </a>
            )}
          </div>
        )}
        {parent.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{parent.email}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t mt-auto">
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 py-1.5 rounded-md transition-colors" title="Lihat Detail">
          <Eye className="w-3.5 h-3.5" /> Detail
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:bg-muted py-1.5 rounded-md transition-colors" title="Edit Data">
          <Edit className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors" title="Hapus Data">
          <Trash2 className="w-3.5 h-3.5" /> Hapus
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const ParentsList: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Delete State
  const { mutate: deleteParent } = useDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mass Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Stats Data
  const { data: allParents } = useList({
    resource: "parents",
    pagination: { pageSize: 1000 },
    meta: { select: "id, is_active" }
  });

  const stats = useMemo(() => {
    const all = allParents?.data || [];
    return {
      total: all.length,
      active: all.filter((p) => p.is_active).length,
      inactive: all.filter((p) => !p.is_active).length
    };
  }, [allParents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    deleteParent(
      { resource: "parents", id: deleteConfirmId },
      {
        onSuccess: () => {
          toast.success("Data orang tua berhasil dihapus");
          setDeleteConfirmId(null);
        },
        onError: () => toast.error("Gagal menghapus data orang tua"),
        onSettled: () => setIsDeleting(false)
      }
    );
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Orang Tua / Wali",
        cell: function render({ getValue, row }) {
          const name = getValue<string>() || "";
          const avatarColor = getAvatarColor(name);
          return (
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {getInitials(name)}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">{name}</span>
                {row.original.nik && <span className="text-[10px] text-muted-foreground">NIK: {row.original.nik}</span>}
              </div>
            </div>
          );
        },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Kontak",
        cell: function render({ getValue, row }) {
          const phone = getValue<string>();
          const email = row.original.email;
          const waNumber = formatWhatsAppNumber(phone);
          return (
            <div className="flex flex-col gap-1 text-xs">
              {phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{phone}</span>
                  {waNumber && (
                    <a 
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-100 text-green-700 hover:bg-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors"
                      title="Hubungi via WhatsApp"
                    >
                      WA
                    </a>
                  )}
                </div>
              ) : <span className="text-muted-foreground">-</span>}
              {email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span>{email}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "occupation",
        accessorKey: "occupation",
        header: "Pekerjaan",
        cell: function render({ getValue }) {
          const val = getValue<string>();
          return val ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-50 border px-2 py-1 rounded-md">
              <Briefcase className="w-3.5 h-3.5" />
              {val}
            </span>
          ) : <span className="text-muted-foreground italic text-xs">-</span>;
        },
      },
      {
        id: "status",
        accessorKey: "is_active",
        header: "Status",
        cell: function render({ getValue }) {
          const isActive = getValue<boolean>();
          return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ getValue }) {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/parents/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/parents/edit/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Ubah Data"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirmId(getValue() as string)}
                className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Hapus Data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const filters: any[] = [];
  if (searchQuery) {
    filters.push({
      operator: "or",
      value: [
        { field: "full_name", operator: "ilike", value: `%${searchQuery}%` },
        { field: "phone", operator: "ilike", value: `%${searchQuery}%` },
        { field: "email", operator: "ilike", value: `%${searchQuery}%` },
        { field: "nik", operator: "ilike", value: `%${searchQuery}%` }
      ]
    });
  }

  const { refineCore: { tableQueryResult }, ...table } = useTable<any>({
    columns,
    refineCoreProps: {
      resource: "parents",
      filters: { permanent: filters },
      sorters: { permanent: [{ field: "full_name", order: "asc" }] },
      pagination: { pageSize: 20 }
    }
  });

  const isLoading = tableQueryResult.isLoading;
  const rows = table.getRowModel().rows;

  // ─── Upload Logic ────────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csvContent = "Nama Lengkap,NIK,No HP,Email,Pekerjaan,Pendidikan Terakhir,Agama,Alamat\nBudi Raharjo,3201234567890001,08123456789,budi@email.com,Karyawan Swasta,S1,Islam,Jl. Merdeka No. 1";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Upload_OrangTua.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          setPreviewData(results.data);
        }
      });
    }
  };

  const processUpload = async () => {
    if (!uploadFile) {
      toast.error("Pilih file CSV yang akan diunggah!");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const validRows = previewData.filter((row: any) => row['Nama Lengkap']);
      
      if (validRows.length === 0) {
        toast.error("File CSV kosong atau format tidak sesuai.");
        setIsUploading(false);
        return;
      }

      const parentsToInsert = validRows.map((row: any) => ({
        full_name: row['Nama Lengkap'],
        nik: row['NIK'] || null,
        phone: row['No HP'] || null,
        email: row['Email'] || null,
        occupation: row['Pekerjaan'] || null,
        education: row['Pendidikan Terakhir'] || null,
        religion: row['Agama'] || 'Islam',
        address: row['Alamat'] || null,
        is_active: true
      }));

      const { error } = await supabaseClient.from('parents').insert(parentsToInsert);
      
      if (error) throw error;
      
      toast.success(`Berhasil mengunggah ${parentsToInsert.length} data orang tua!`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setPreviewData([]);
      
      tableQueryResult.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mengunggah data: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Orang Tua / Wali"
        description="Kelola direktori kontak, profil pekerjaan, dan data demografis orang tua/wali siswa."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shadow-sm font-medium text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Masal
            </button>
            <Link
              to="/parents/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Orang Tua
            </Link>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Orang Tua" value={stats.total} color="bg-blue-100 text-blue-700" />
        <StatCard icon={UserCheck} label="Orang Tua Aktif" value={stats.active} color="bg-emerald-100 text-emerald-700" />
        <StatCard icon={UserX} label="Nonaktif" value={stats.inactive} color="bg-gray-100 text-gray-700" />
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-card rounded-xl border shadow-sm p-4">
        <div className="flex gap-3 items-center">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari berdasarkan nama, NIK, nomor HP, atau email..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background transition-all"
              />
            </div>
            <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              Cari
            </button>
          </form>
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden bg-background">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="Tampilan Tabel"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 transition-colors ${viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="bg-card rounded-xl border shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        {isLoading ? (
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
             <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-sm font-medium">Memuat data orang tua...</p>
           </div>
        ) : rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Tidak Ada Data</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Belum ada data orang tua yang ditemukan atau kriteria pencarian tidak cocok.
            </p>
            <Link to="/parents/create" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Plus className="w-4 h-4" /> Tambah Data Sekarang
            </Link>
          </div>
        ) : viewMode === "card" ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-muted/10 flex-1">
            {rows.map((row) => (
              <ParentCard
                key={row.original.id}
                parent={row.original}
                onClick={() => navigate(`/parents/show/${row.original.id}`)}
                onEdit={() => navigate(`/parents/edit/${row.original.id}`)}
                onDelete={() => setDeleteConfirmId(row.original.id)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id} className="px-6 py-3.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Halaman <strong>{table.getState().pagination.pageIndex + 1}</strong> dari <strong>{table.getPageCount()}</strong>
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="bg-background border border-input rounded-md text-sm px-2 py-1.5 ml-4 focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Tampilkan {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-4 py-1.5 text-sm border rounded-md hover:bg-background bg-white disabled:opacity-50 transition-colors font-medium shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-4 py-1.5 text-sm border rounded-md hover:bg-background bg-white disabled:opacity-50 transition-colors font-medium shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      <Modal isOpen={isUploadModalOpen} onClose={() => !isUploading && setIsUploadModalOpen(false)} title="Upload Masal Data Orang Tua">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold mb-1">Panduan Upload</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                <li>Unduh template CSV terlebih dahulu jika belum memilikinya.</li>
                <li>Isi data orang tua/wali sesuai format pada template. Kolom <b>Nama Lengkap</b> wajib diisi.</li>
                <li>Gunakan aplikasi Spreadsheet (Excel/Google Sheets) lalu simpan kembali dalam format <b>CSV</b>.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-700 hover:border-primary hover:text-primary px-4 py-3 rounded-xl transition-all font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Template CSV
          </button>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-gray-700">Upload File CSV</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border rounded-lg px-3 py-2 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>

          {previewData.length > 0 && (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm text-center text-emerald-800">
              Ditemukan <span className="font-bold text-emerald-600 text-base mx-1">{previewData.filter(r => r['Nama Lengkap']).length}</span> baris data yang valid siap untuk diunggah.
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
              className="px-5 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={processUpload}
              disabled={isUploading || !uploadFile}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengunggah...
                </>
              ) : (
                "Mulai Upload"
              )}
            </button>
          </div>
        </div>
      </Modal>

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
