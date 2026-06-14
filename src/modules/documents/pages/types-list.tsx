import React from "react";
import { useList, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { FileText, Plus, Trash2, Edit } from "lucide-react";

export const DocumentTypesList: React.FC = () => {
  const { data, isLoading } = useList({
    resource: "document_types",
    meta: { select: "*, units(name)" },
    sorters: [{ field: "category", order: "asc" }]
  });

  const { mutate: deleteType } = useDelete();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Jenis Dokumen"
        description="Kelola master data persyaratan dokumen yang harus diunggah."
        action={
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
            <Plus className="w-4 h-4" /> Tambah Jenis Dokumen
          </button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Nama Dokumen</th>
                <th className="px-6 py-4">Kode / Klasifikasi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Peruntukan</th>
                <th className="px-6 py-4">Wajib / Opsional</th>
                <th className="px-6 py-4">Unit Terkait</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((type) => (
                <tr key={type.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground"/> {type.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {type.classification_code || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 border text-slate-800 text-xs font-semibold rounded-md uppercase">
                      {type.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {type.category === 'surat' ? (
                      <span className={`px-2 py-1 border text-xs font-semibold rounded-md capitalize ${type.audience === 'internal' ? 'bg-blue-50 text-blue-700' : type.audience === 'eksternal' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'}`}>
                        {type.audience || "Umum"}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4">
                    {type.is_required ? (
                      <span className="text-destructive font-semibold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">Wajib</span>
                    ) : (
                      <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded border">Opsional</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{type.units?.name || "Semua Unit"}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Edit className="w-4 h-4"/></button>
                    <button 
                      onClick={() => { if(confirm('Hapus jenis dokumen ini?')) deleteType({ resource: "document_types", id: type.id as string }) }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2"
                    ><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Belum ada jenis dokumen diatur.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
