import React, { useState } from "react";
import { useShow, useList, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Edit, ArrowLeft, Users, Plus, X } from "lucide-react";
import { AuditHistory } from "../../../components/common/AuditHistory";
import { Link, useNavigate } from "react-router-dom";
import { calculateCompleteness } from "./list";
import { ParentForm } from "../../parents/components/parent-form";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [linkMode, setLinkMode] = useState<"existing" | "new">("new");
  
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
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <User className="w-12 h-12 text-primary/50" />
            </div>
            <h2 className="text-xl font-bold">{record.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Panggilan: {record.nickname || "-"}</p>
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border mb-6 ${record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              Status: {record.status}
            </div>
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
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <AuditHistory resource="students" resourceId={record.id as string} />
        </div>
      </div>

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

    </div>
  );
};
