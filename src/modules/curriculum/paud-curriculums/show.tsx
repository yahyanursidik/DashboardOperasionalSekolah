import React from "react";
import { useShow } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Layers3,
  Printer,
} from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import {
  FOUNDATION_ELEMENTS,
  PAUD_FOUNDATION_LEVEL,
  getPaudCompletion,
  getPaudLevelMeta,
} from "./paudCurriculumTemplates";

const SectionTitle: React.FC<{
  id?: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  tone?: string;
}> = ({ id, icon: Icon, title, subtitle, tone = "text-primary" }) => (
  <div id={id} className="scroll-mt-6 border-b pb-3">
    <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
      <Icon className={`h-5 w-5 ${tone}`} /> {title}
    </h2>
    {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
  </div>
);

const EmptySection: React.FC<{ text: string }> = ({ text }) => (
  <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm italic text-muted-foreground">{text}</p>
);

const TextBlock: React.FC<{ label: string; value?: string; tone?: string }> = ({ label, value, tone = "text-muted-foreground" }) => (
  <div className="rounded-md border bg-background p-3">
    <p className={`text-xs font-bold uppercase ${tone}`}>{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm">{value || "-"}</p>
  </div>
);

const groupRpphByWeek = (rows: any[]) =>
  rows.reduce<Record<string, any[]>>((acc, row, index) => {
    const week = String(row.minggu_ke || "Tanpa Minggu");
    if (!acc[week]) acc[week] = [];
    acc[week].push({ ...row, _index: index });
    return acc;
  }, {});

export const PaudThemeShow: React.FC = () => {
  const navigate = useNavigate();
  const { queryResult } = useShow({
    resource: "paud_curriculums",
    meta: { select: "*, academic_years(name)" },
  });

  const { data, isLoading } = queryResult;
  const record = data?.data;

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Memuat data dokumen...</div>;
  if (!record) return <div className="p-8 text-destructive">Data tidak ditemukan.</div>;

  const isFaseFondasi = record.grade_level === PAUD_FOUNDATION_LEVEL;
  const levelMeta = getPaudLevelMeta(record.grade_level);
  const completion = getPaudCompletion(record);
  const rpphByWeek = groupRpphByWeek(Array.isArray(record.rpph_data) ? record.rpph_data : []);

  const navItems = isFaseFondasi
    ? [
        { id: "identitas", label: "Identitas", icon: BookOpen },
        { id: "atp", label: "ATP", icon: AlignLeft },
        { id: "prota", label: "Prota", icon: Clock },
        { id: "prosem", label: "Prosem", icon: Calendar },
      ]
    : [
        { id: "identitas", label: "Identitas", icon: BookOpen },
        { id: "rppm", label: "RPPM", icon: Layers3 },
        { id: "rpph", label: "RPPH", icon: Calendar },
      ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/curriculum/paud" className="rounded-full p-2 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${levelMeta.tone}`}>
              {levelMeta.label}
            </span>
            <h1 className="mt-2 text-2xl font-black text-foreground">
              {isFaseFondasi ? "Dokumen Induk Fase Fondasi" : `Modul Ajar ${levelMeta.label}`}
            </h1>
            <p className="text-sm text-muted-foreground">Tahun Ajaran {record.academic_years?.name || "-"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
          <button
            onClick={() => navigate(`/curriculum/paud/edit/${record.id}`)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <aside className="print:hidden rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-[220px]">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kelengkapan</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-black text-foreground">{completion.percent}%</span>
                <span className="pb-1 text-sm font-semibold text-muted-foreground">selesai</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {completion.chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                    chip.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {chip.label}: {chip.value}
                </span>
              ))}
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  {index + 1}. {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          <section id="identitas" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
            <SectionTitle id="identitas-title" icon={BookOpen} title="Identitas Dokumen" subtitle="Ringkasan dokumen dan konteks pembelajaran." />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Tingkat</p>
                <p className="mt-1 text-base font-bold text-foreground">{levelMeta.label}</p>
                <p className="text-sm text-muted-foreground">{levelMeta.name}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Tahun Ajaran</p>
                <p className="mt-1 text-base font-bold text-foreground">{record.academic_years?.name || "-"}</p>
                <p className="text-sm text-muted-foreground">Periode dokumen</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Jenis Dokumen</p>
                <p className="mt-1 text-base font-bold text-foreground">{isFaseFondasi ? "Induk Fase Fondasi" : "Modul Ajar Tingkat"}</p>
                <p className="text-sm text-muted-foreground">{isFaseFondasi ? "ATP, Prota, Prosem" : "RPPM dan RPPH"}</p>
              </div>
            </div>
          </section>

          {isFaseFondasi ? (
            <>
              <section id="atp" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
                <SectionTitle icon={AlignLeft} title="Alur Tujuan Pembelajaran (ATP)" subtitle="Arah pembelajaran Fase Fondasi untuk KB, TK A, dan TK B." />
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3 print:grid-cols-3">
                  {FOUNDATION_ELEMENTS.map((element) => (
                    <div key={element} className="rounded-lg border bg-muted/30 p-3 text-sm font-semibold">
                      {element}
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  {record.atp_text ? (
                    <div className="overflow-hidden rounded-lg border bg-background/60">
                      <MDEditor.Markdown
                        source={record.atp_text}
                        rehypePlugins={[[rehypeSanitize]]}
                        className="!bg-transparent px-5 py-5 leading-8 text-foreground sm:px-8 sm:py-7"
                      />
                    </div>
                  ) : (
                    <EmptySection text="Belum ada dokumen ATP yang diinput." />
                  )}
                </div>
              </section>

              <section id="prota" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
                <SectionTitle icon={Clock} title="Program Tahunan (Prota)" subtitle="Pemetaan bulan, tema/topik, dan alokasi waktu per pekan." />
                {record.prota_data?.length > 0 ? (
                  <div className="mt-5 overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full min-w-[1180px] text-left text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="w-14 border-r p-3 text-center">No</th>
                          <th className="w-44 border-r p-3">Bulan</th>
                          <th className="min-w-[240px] border-r p-3">Tema Besar</th>
                          <th className="min-w-[320px] border-r p-3">Subtema / Topik</th>
                          <th className="w-40 border-r p-3">Alokasi Waktu</th>
                          <th className="min-w-[320px] border-r p-3">Integrasi Khas TS Lab School</th>
                          <th className="w-56 p-3">Semester</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.prota_data.map((row: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/30">
                            <td className="border-r p-3 text-center font-semibold">{index + 1}</td>
                            <td className="border-r p-3 font-medium">{row.bulan || "-"}</td>
                            <td className="border-r p-3 whitespace-pre-wrap">{row.tema_topik || row.materi_pokok || row.materi || "-"}</td>
                            <td className="border-r p-3 whitespace-pre-wrap">{row.subtema_topik || "-"}</td>
                            <td className="border-r p-3">{row.alokasi_waktu || "-"}</td>
                            <td className="border-r p-3 whitespace-pre-wrap">{row.integrasi_khas || "-"}</td>
                            <td className="p-3">{row.semester || "Semester I (Gasal/Ganjil)"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptySection text="Belum ada data Prota." />
                  </div>
                )}
              </section>

              <section id="prosem" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
                <div className="flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
                  <SectionTitle icon={Calendar} title="Program Semester (Prosem)" subtitle="Urutan topik dan modul ajar per minggu." />
                  {record.prosem_data?.semester && (
                    <span className="w-fit rounded-md bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                      {record.prosem_data.semester}
                    </span>
                  )}
                </div>
                {record.prosem_data?.rows?.length > 0 ? (
                  <div className="mt-5 overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full min-w-[1040px] text-left text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="w-24 border-r p-3 text-center">Minggu</th>
                          <th className="w-52 border-r p-3">Semester</th>
                          <th className="w-36 border-r p-3">Bulan</th>
                          <th className="border-r p-3">Topik / Subtopik</th>
                          <th className="p-3">Modul Ajar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.prosem_data.rows.map((row: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/30">
                            <td className="border-r p-3 text-center font-semibold">{row.minggu || index + 1}</td>
                            <td className="border-r p-3">{row.semester || "Semester I (Gasal/Ganjil)"}</td>
                            <td className="border-r p-3 font-medium">{row.bulan || "-"}</td>
                            <td className="border-r p-3 whitespace-pre-wrap">{row.topik_subtopik || row.materi_pokok || "-"}</td>
                            <td className="p-3 whitespace-pre-wrap">{row.modul_ajar || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptySection text="Belum ada data Prosem." />
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section id="rppm" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
                <SectionTitle icon={Layers3} title="RPPM (Rencana Pembelajaran Mingguan)" subtitle="Ragam kegiatan main dan tujuan pembelajaran setiap pekan." />
                {record.rppm_data?.length > 0 ? (
                  <div className="mt-5 space-y-6">
                    {record.rppm_data.map((row: any, index: number) => (
                      <div key={index} className="break-inside-avoid rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center gap-3 border-b pb-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-black text-primary">
                            M{row.minggu_ke || index + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-foreground">Minggu Ke-{row.minggu_ke || index + 1}</h3>
                            <p className="text-xs text-muted-foreground">Rencana pembelajaran mingguan</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="mb-2 text-sm font-bold text-foreground">A. Identitas</p>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <TextBlock label="Satuan Pendidikan" value={row.satuan_pendidikan} />
                              <TextBlock label="Jenjang / Kelas" value={row.jenjang_kelas} />
                              <TextBlock label="Semester" value={row.semester} />
                              <TextBlock label="Bulan" value={row.bulan} />
                              <TextBlock label="Fase" value={row.fase} />
                              <TextBlock label="Alokasi Waktu" value={row.alokasi_waktu} />
                              <TextBlock label="Topik" value={row.topik} />
                              <TextBlock label="Subtopik" value={row.subtopik} />
                              <TextBlock label="Modul Ajar" value={row.modul_ajar} />
                              <div className="md:col-span-3">
                                <TextBlock label="Karakter Khas TSLS" value={row.karakter_khas} />
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-sm font-bold text-foreground">B. Tujuan Pembelajaran</p>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                              <TextBlock label="Nilai Agama dan Budi Pekerti" value={row.cp_agama} />
                              <TextBlock label="Jati Diri" value={row.cp_jati_diri} />
                              <TextBlock label="Literasi, STEAM, Seni" value={row.cp_literasi} />
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                              <TextBlock label="Tujuan Mingguan" value={row.tujuan_mingguan || row.tujuan_kegiatan} tone="text-primary" />
                              <TextBlock label="Penguatan Khas TSLS" value={row.penguatan_tsls || row.materi} tone="text-primary" />
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-sm font-bold text-foreground">C. Kegiatan Inti Mingguan</p>
                            {Array.isArray(row.kegiatan_inti_mingguan) && row.kegiatan_inti_mingguan.length > 0 ? (
                              <div className="overflow-x-auto rounded-md border bg-background">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="border-r p-3">Hari</th>
                                      <th className="border-r p-3">Fokus</th>
                                      <th className="border-r p-3">Kegiatan Inti</th>
                                      <th className="p-3">Alat dan Bahan</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.kegiatan_inti_mingguan.map((activity: any, activityIndex: number) => (
                                      <tr key={activityIndex} className="border-t">
                                        <td className="border-r p-3 font-semibold">{activity.hari || `Hari ${activityIndex + 1}`}</td>
                                        <td className="border-r p-3">{activity.fokus || "-"}</td>
                                        <td className="border-r p-3 whitespace-pre-wrap">{activity.kegiatan || "-"}</td>
                                        <td className="p-3 whitespace-pre-wrap">{activity.alat_bahan || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <TextBlock label="Rencana Kegiatan Main" value={row.rencana_kegiatan} tone="text-primary" />
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <TextBlock label="E. Pembiasaan Harian" value={row.pembiasaan_harian} />
                            <TextBlock label="F. Asesmen Mingguan" value={row.asesmen_mingguan} />
                            <TextBlock label="G. Catatan untuk Guru" value={row.catatan_guru} />
                            <TextBlock label="H. Umpan Balik Guru" value={row.umpan_balik_guru} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptySection text="Belum ada data RPPM." />
                  </div>
                )}
              </section>

              <section id="rpph" className="rounded-lg border bg-card p-5 sm:p-6 lg:p-8 print:border-none">
                <SectionTitle icon={Calendar} title="RPPH / Modul Ajar Harian" subtitle="Skenario kegiatan harian yang dikelompokkan per minggu." />
                {record.rpph_data?.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {Object.entries(rpphByWeek).map(([week, rows]) => (
                      <div key={week} className="rounded-lg border bg-muted/20 p-4">
                        <h3 className="mb-4 flex items-center gap-2 font-black text-foreground">
                          <span className="rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">M{week}</span>
                          Minggu Ke-{week}
                        </h3>
                        <div className="space-y-4">
                          {rows.map((row: any) => (
                            <div key={row._index} className="break-inside-avoid rounded-lg border bg-background p-4">
                              <div className="mb-4 flex flex-wrap items-center gap-3 border-b pb-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                                  H{row.hari_ke || row._index + 1}
                                </span>
                                <div>
                                  <h4 className="font-bold text-foreground">Hari Ke-{row.hari_ke || row._index + 1}</h4>
                                  {row.topik_harian && <p className="text-sm font-medium text-primary">{row.topik_harian}</p>}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                <div className="rounded-md bg-muted/30 p-3">
                                  <p className="text-xs font-bold uppercase text-muted-foreground">Tujuan Pembelajaran</p>
                                  <p className="mt-1 whitespace-pre-wrap">{row.tujuan_pembelajaran || "-"}</p>
                                </div>
                                <div className="rounded-md bg-muted/30 p-3">
                                  <p className="text-xs font-bold uppercase text-muted-foreground">Alat dan Bahan</p>
                                  <p className="mt-1 whitespace-pre-wrap">{row.alat_bahan || "-"}</p>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
                                <div className="rounded-md border p-3">
                                  <p className="mb-2 border-b pb-1 font-bold text-muted-foreground">1. Pembuka</p>
                                  <p className="whitespace-pre-wrap">{row.kegiatan_pembuka || "-"}</p>
                                </div>
                                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                                  <p className="mb-2 border-b border-primary/20 pb-1 font-bold text-primary">2. Inti</p>
                                  <p className="whitespace-pre-wrap">{row.kegiatan_inti || "-"}</p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="mb-2 border-b pb-1 font-bold text-muted-foreground">3. Penutup dan Asesmen</p>
                                  <p className="whitespace-pre-wrap">{row.kegiatan_penutup || "-"}</p>
                                  <div className="mt-3 border-t pt-2">
                                    <p className="text-xs font-bold uppercase text-muted-foreground">Asesmen</p>
                                    <p className="mt-1 whitespace-pre-wrap italic">{row.asesmen || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptySection text="Belum ada data RPPH." />
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
