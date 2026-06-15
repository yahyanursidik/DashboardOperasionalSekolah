import React from "react";
import { useShow, useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Edit, ArrowLeft, Phone, Mail, MapPin, GraduationCap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const formatWhatsAppNumber = (phone: string) => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
};

export const ParentShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();

  const record = data?.data;

  // Fetch linked children
  const { data: childrenData, isLoading: childrenLoading } = useList({
    resource: "student_parent_links",
    filters: [
      { field: "parent_id", operator: "eq", value: record?.id }
    ],
    meta: {
      select: "*, students(*, classes(name))"
    },
    queryOptions: { enabled: !!record?.id }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>;
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Data tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Orang Tua / Wali"
        description={`Detail informasi untuk ${record.full_name}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/parents")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/parents/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Ubah Data
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <User className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold">{record.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{record.occupation || "Tidak ada keterangan pekerjaan"}</p>
            
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border mb-6 ${record.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              Status: {record.is_active ? 'Aktif' : 'Nonaktif'}
            </div>

            <div className="text-left border-t pt-4 space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{record.phone || "-"}</p>
                    {record.phone && (
                      <a 
                        href={`https://wa.me/${formatWhatsAppNumber(record.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Hubungi via WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        WA
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Nomor HP / WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.email || "-"}</p>
                  <p className="text-xs text-muted-foreground">Alamat Email</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.address || "-"}</p>
                  <p className="text-xs text-muted-foreground">Alamat Domisili</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Linked Children */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> Anak / Tanggungan Siswa
            </h3>
            
            {childrenLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data siswa...</p>
            ) : childrenData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada siswa yang ditautkan ke orang tua ini.</p>
                <p className="text-xs text-muted-foreground mt-1">Anda dapat menautkan orang tua dari halaman Profil Siswa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {childrenData?.data?.map((link: any) => {
                  const student = link.students;
                  const relations: Record<string, string> = { father: "Ayah", mother: "Ibu", guardian: "Wali" };
                  return (
                    <div key={link.id} className="border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/students/show/${student.id}`)}>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">Kelas: {student.classes?.name || "-"}</p>
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
        </div>

      </div>
    </div>
  );
};
