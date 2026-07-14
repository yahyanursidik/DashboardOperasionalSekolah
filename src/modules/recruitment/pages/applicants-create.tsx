import React, { useMemo, useState } from "react";
import { useForm, useList } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

export const ApplicantCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";
  const [formState, setFormState] = useState({
    vacancy_id: "",
    full_name: "",
    email: "",
    phone: "",
    last_education: "",
    address: "",
    cv_url: "",
  });

  const { onFinish, formLoading } = useForm({
    resource: "recruitment_applicants",
    action: "create",
    redirect: false,
    mutationMode: "pessimistic",
  });

  const { data: vacancies } = useList({
    resource: "recruitment_vacancies",
    filters: [{ field: "status", operator: "eq", value: "open" }],
    sorters: [{ field: "deadline", order: "asc" }],
  });

  const selectedVacancy = useMemo(
    () => vacancies?.data?.find((vacancy: any) => vacancy.id === formState.vacancy_id),
    [formState.vacancy_id, vacancies?.data]
  );

  const checklist = [
    { label: "Lowongan aktif dipilih", done: !!formState.vacancy_id },
    { label: "Nama dan kontak utama lengkap", done: !!formState.full_name && !!formState.phone },
    { label: "Email valid untuk komunikasi resmi", done: !formState.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email) },
    { label: "Pendidikan terakhir tercatat", done: !!formState.last_education },
    { label: "Alamat atau domisili diisi", done: !!formState.address },
    { label: "Link CV/berkas tersedia bila ada", done: true },
  ];

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.vacancy_id) return toast.error("Pilih lowongan yang dilamar");
    if (!formState.full_name.trim()) return toast.error("Nama lengkap wajib diisi");
    if (!formState.phone.trim()) return toast.error("Nomor WhatsApp wajib diisi");
    if (formState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) return toast.error("Format email belum valid");

    await onFinish({
      vacancy_id: formState.vacancy_id,
      full_name: formState.full_name.trim(),
      email: formState.email.trim() || null,
      phone: formState.phone.trim(),
      last_education: formState.last_education.trim(),
      address: formState.address.trim() || null,
      cv_url: formState.cv_url.trim() || null,
      status: "berkas_masuk",
    });
    navigate(`${basePortal}/applicants`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Data Pelamar Baru"
        description="Masukkan kandidat ke ATS dengan data awal yang cukup untuk seleksi berkas."
        action={
          <button
            onClick={() => navigate(`${basePortal}/applicants`)}
            className="flex items-center gap-2 bg-card text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Batal
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Lowongan yang Dilamar *</label>
                <select
                  value={formState.vacancy_id}
                  onChange={(e) => updateField("vacancy_id", e.target.value)}
                  required
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                >
                  <option value="">Pilih Lowongan Tersedia...</option>
                  {vacancies?.data?.map((vacancy: any) => (
                    <option key={vacancy.id} value={vacancy.id}>
                      {vacancy.title}
                    </option>
                  ))}
                </select>
                {selectedVacancy && (
                  <p className="text-xs text-muted-foreground">Kuota {selectedVacancy.quota || 1} orang, deadline {selectedVacancy.deadline || "-"}.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap *</label>
                <input
                  value={formState.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  required
                  placeholder="Contoh: Muhammad Fatih"
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pendidikan Terakhir *</label>
                <input
                  value={formState.last_education}
                  onChange={(e) => updateField("last_education", e.target.value)}
                  required
                  placeholder="Contoh: S1 Pendidikan Agama Islam"
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor WhatsApp *</label>
                <input
                  value={formState.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  placeholder="08123456789"
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Link CV / Berkas Digital</label>
                <input
                  value={formState.cv_url}
                  onChange={(e) => updateField("cv_url", e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Alamat Domisili</label>
                <textarea
                  value={formState.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  rows={3}
                  placeholder="Tuliskan alamat lengkap atau domisili saat ini."
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 bg-background resize-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm disabled:opacity-70"
              >
                <Save className="w-4 h-4" /> {formLoading ? "Menyimpan..." : "Simpan Pelamar"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4 h-fit">
          <div>
            <p className="text-sm font-semibold">Definition of Done</p>
            <p className="text-xs text-muted-foreground">Data awal siap untuk seleksi berkas.</p>
          </div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
