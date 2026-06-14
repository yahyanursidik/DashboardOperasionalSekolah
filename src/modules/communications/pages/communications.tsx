import React, { useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MessageSquare, Send, Users, Smartphone, FileText, CheckCircle2 } from "lucide-react";
import { useList } from "@refinedev/core";

export const CommunicationsPage: React.FC = () => {
  const [targetType, setTargetType] = useState<"all_parents" | "class_parents" | "all_teachers">("class_parents");
  const [selectedClass, setSelectedClass] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Ambil daftar kelas untuk dropdown
  const { data: classesData, isLoading: isLoadingClasses } = useList({ resource: "classes" });

  const handleSend = () => {
    if (!message) return;
    setIsSending(true);
    // Simulasi pengiriman pesan
    setTimeout(() => {
      setIsSending(false);
      setShowSuccess(true);
      setMessage("");
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Komunikasi"
        description="Kirim pesan broadcast (WhatsApp/SMS) atau email ke Orang Tua, Siswa, dan Guru."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Kirim Pesan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Tulis Pesan Broadcast Baru</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Target Penerima */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Pilih Target Penerima</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setTargetType("class_parents")}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all ${targetType === "class_parents" ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "hover:border-primary/50 text-muted-foreground"}`}
                  >
                    <Users className="w-4 h-4" /> Orang Tua per Kelas
                  </button>
                  <button
                    onClick={() => setTargetType("all_parents")}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all ${targetType === "all_parents" ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "hover:border-primary/50 text-muted-foreground"}`}
                  >
                    <Users className="w-4 h-4" /> Semua Orang Tua
                  </button>
                  <button
                    onClick={() => setTargetType("all_teachers")}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all ${targetType === "all_teachers" ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "hover:border-primary/50 text-muted-foreground"}`}
                  >
                    <Users className="w-4 h-4" /> Semua Guru
                  </button>
                </div>
              </div>

              {/* Dropdown Kelas jika target per kelas */}
              {targetType === "class_parents" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <label className="text-sm font-medium">Pilih Kelas</label>
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary bg-background"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classesData?.data?.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name} (Tingkat {cls.grade_level})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Isi Pesan */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium">Isi Pesan</label>
                  <span className="text-xs text-muted-foreground">Variabel: {'{nama_ortu}'}, {'{nama_siswa}'}</span>
                </div>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ketik pesan Anda di sini..."
                  rows={6}
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Tombol Kirim */}
              <div className="pt-2 flex justify-end gap-3">
                <button className="px-6 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
                  Simpan Draft
                </button>
                <button 
                  onClick={handleSend}
                  disabled={isSending || !message || (targetType === "class_parents" && !selectedClass)}
                  className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-2.5 rounded-lg hover:bg-[#1DA851] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSending ? (
                    "Mengirim..."
                  ) : showSuccess ? (
                    <><CheckCircle2 className="w-4 h-4" /> Terkirim</>
                  ) : (
                    <><Smartphone className="w-4 h-4" /> Kirim via WhatsApp</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Info & Riwayat */}
        <div className="space-y-6">
          {/* Card Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Integrasi WhatsApp
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fitur pesan otomatis ini akan dikirim melalui nomor WhatsApp Official Sekolah. Pastikan format nomor HP orang tua pada Master Data sudah benar (diawali 08 atau 62).
            </p>
          </div>

          {/* Riwayat Terakhir */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Riwayat Broadcast</h3>
            </div>
            <div className="divide-y">
              {[
                { title: "Pengumuman Libur Idul Adha", target: "Semua Orang Tua", date: "Hari ini, 09:30" },
                { title: "Tagihan SPP Juli", target: "Kelas 7A", date: "Kemarin, 14:15" },
                { title: "Rapat Koordinasi Ujian", target: "Semua Guru", date: "10 Jun 2026" },
              ].map((item, i) => (
                <div key={i} className="p-4 hover:bg-muted/30 transition-colors">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">{item.target}</span>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full p-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
              Lihat Semua Riwayat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
