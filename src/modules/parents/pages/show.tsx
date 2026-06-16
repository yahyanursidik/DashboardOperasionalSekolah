import React from "react";
import { useShow, useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Edit, ArrowLeft, Phone, Mail, MapPin, GraduationCap, Users, Briefcase } from "lucide-react";
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

  const mainRelation = childrenData?.data?.[0]?.relationship || 'father';
  
  let father = null;
  let mother = null;

  if (mainRelation === 'father') {
    father = record;
    mother = spouse;
  } else if (mainRelation === 'mother') {
    mother = record;
    father = spouse;
  } else {
    // Fallback if guardian
    father = record;
    mother = spouse;
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(record?.address || "Jakarta")}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

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
        {/* LEFT COLUMN: Profile Info (Father, Mother, Maps) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Profil Orang Tua / Wali
            </h3>
            
            <div className="space-y-6">
              {/* Alamat & Maps */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Alamat Domisili
                </h4>
                <p className="text-sm text-muted-foreground mb-3">{record.address || "Alamat belum diisi"}</p>
                <div className="w-full h-48 rounded-xl overflow-hidden border bg-muted/20">
                  <iframe 
                    src={mapUrl} 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokasi Alamat"
                  ></iframe>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                {/* Ayah */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">Data Ayah</h4>
                  {father ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                        <p className="font-semibold">{father.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{father.occupation || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{father.phone || "-"} (WA Aktif)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{father.email || "-"}</span>
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${father.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          Status: {father.is_active ? 'Aktif / Hidup' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Data ayah belum tersedia.</p>
                  )}
                </div>

                {/* Ibu */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg inline-block">Data Ibu</h4>
                  {mother ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                        <p className="font-semibold">{mother.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{mother.occupation || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{mother.phone || "-"} (WA Aktif)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{mother.email || "-"}</span>
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${mother.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          Status: {mother.is_active ? 'Aktif / Hidup' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Data ibu belum tersedia.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Linked Children */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> Data Anak
            </h3>
            
            {childrenLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data siswa...</p>
            ) : childrenData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada anak yang ditautkan ke orang tua ini.</p>
                <p className="text-xs text-muted-foreground mt-1">Anda dapat menautkan orang tua dari halaman Profil Siswa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {childrenData?.data?.map((link: any) => {
                  const student = link.students;
                  const relations: Record<string, string> = { father: "Ayah", mother: "Ibu", guardian: "Wali" };
                  return (
                    <div key={link.id} className="border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/students/show/${student.id}`)}>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">Kelas: {student.classes?.name || "-"}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-full">
                            Sebagai: {relations[link.relationship] || link.relationship}
                          </span>
                          {link.is_primary && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Utama
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
