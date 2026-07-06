import React, { useState, useEffect } from "react";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Eye, Edit, Trash2, Plus, FileText, Video, Image as ImageIcon, Music, PlayCircle, HardDrive, Search, Filter, ChevronRight, Inbox } from "lucide-react";
import { toast } from "sonner";

export const OnboardingList: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: deleteMaterial } = useDelete();

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Judul Materi",
        cell: function render({ getValue }) {
          return <span className="font-semibold text-gray-900">{getValue<string>()}</span>;
        },
      },
      {
        id: "material_type",
        accessorKey: "material_type",
        header: "Tipe",
        cell: function render({ getValue }) {
          const type = getValue<string>();
          const getIcon = () => {
            switch (type) {
              case 'pdf': return <FileText className="w-3.5 h-3.5" />;
              case 'video': return <Video className="w-3.5 h-3.5" />;
              case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
              case 'audio': return <Music className="w-3.5 h-3.5" />;
              case 'youtube': return <PlayCircle className="w-3.5 h-3.5" />;
              case 'gdrive': return <HardDrive className="w-3.5 h-3.5" />;
              case 's3_link': return <HardDrive className="w-3.5 h-3.5 text-blue-500" />;
              default: return null;
            }
          };
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium uppercase tracking-wider">
              {getIcon()}
              {type === 's3_link' ? 'S3 Contabo' : type}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const status = getValue<string>();
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              status === 'published' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {status === 'published' ? 'Dipublikasikan' : 'Draft'}
            </span>
          );
        },
      },
      {
        id: "order_index",
        accessorKey: "order_index",
        header: "Urutan",
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ getValue, row }) {
          const id = getValue<string>();
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/onboarding/show/${id}`)}
                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                title="Lihat"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/onboarding/edit/${id}`)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus materi ini?")) {
                    deleteMaterial({
                      resource: "onboarding_materials",
                      id,
                      successNotification: () => {
                        toast.success("Materi berhasil dihapus");
                        return false;
                      }
                    });
                  }
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate, deleteMaterial]
  );

  const { refineCore: { tableQueryResult, setFilters }, ...table } = useTable({
    columns,
    refineCoreProps: {
      resource: "onboarding_materials",
      sorters: { permanent: [{ field: "order_index", order: "asc" }] },
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const filters: any[] = [];
    if (searchTerm) {
      filters.push({ field: "title", operator: "contains", value: searchTerm });
    }
    if (statusFilter !== "all") {
      filters.push({ field: "status", operator: "eq", value: statusFilter });
    }
    if (typeFilter !== "all") {
      filters.push({ field: "material_type", operator: "eq", value: typeFilter });
    }
    setFilters(filters);
  }, [searchTerm, statusFilter, typeFilter, setFilters]);

  const isLoading = tableQueryResult.isLoading;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-900 font-medium">Onboarding</span>
      </div>

      <PageHeader
        title="Materi Onboarding"
        description="Kelola materi sambutan dan panduan untuk orang tua siswa."
        action={
          <button
            onClick={() => navigate("/onboarding/create")}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Materi
          </button>
        }
      />

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari judul materi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="image">Gambar</option>
              <option value="audio">Audio</option>
              <option value="youtube">YouTube</option>
              <option value="gdrive">G-Drive</option>
              <option value="s3_link">S3 Contabo</option>
            </select>
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="published">Dipublikasikan</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-medium mb-1">Data Kosong</h3>
            <p className="text-gray-500 text-sm max-w-[250px]">Belum ada materi onboarding yang ditambahkan atau sesuai dengan pencarian Anda.</p>
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? (
              <button 
                onClick={() => {
                  setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all');
                }}
                className="mt-4 text-sm text-emerald-600 font-medium hover:underline"
              >
                Reset Filter
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-600 text-xs uppercase font-semibold border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors group">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

