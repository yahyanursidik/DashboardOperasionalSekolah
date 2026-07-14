import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Award, CheckCircle, Target, AlertTriangle, BarChart3, ClipboardCheck } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const estimateTargetUnits = (target: any) => {
  const amount = Number(target?.target_amount || 1);
  if (target?.amount_unit === "jilid") return amount * 40;
  if (target?.amount_unit === "juz") return amount * 20;
  if (target?.amount_unit === "surah") return amount * 2;
  return amount;
};

const fluencyClass = (score?: string) => {
  if (score === "Sangat Lancar") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score === "Lancar") return "bg-blue-100 text-blue-700 border-blue-200";
  if (score === "Kurang Lancar") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
};

const assessmentClass = (status?: string) => {
  if (status === "Lulus") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "Lulus Bersyarat") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
};

export const PortalQuran: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [records, setRecords] = useState<any[]>([]);
  const [classTargets, setClassTargets] = useState<any[]>([]);
  const [tahfidzTargets, setTahfidzTargets] = useState<any[]>([]);
  const [tahsinTargets, setTahsinTargets] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tahfidz" | "tahsin" | "assessments">("overview");
  const [isLoading, setIsLoading] = useState(true);
  const { activeYearId, activeSemesterId } = useAcademicYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        let recordsQuery = supabaseClient
          .from("quran_records")
          .select("*, employees(full_name), tahfidz_halaqohs(name)")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        if (activeYearId) recordsQuery = recordsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) recordsQuery = recordsQuery.eq("semester_id", activeSemesterId);
        const { data: recordsData } = await recordsQuery;
        setRecords(recordsData || []);

        if (student.class_id && activeYearId && activeSemesterId) {
          const { data: targetsData } = await supabaseClient
            .from("quran_targets")
            .select("*")
            .eq("class_id", student.class_id)
            .eq("academic_year_id", activeYearId)
            .eq("semester_id", activeSemesterId);
          setClassTargets(targetsData || []);
        } else {
          setClassTargets([]);
        }

        let tahfidzTargetQuery = supabaseClient
          .from("tahfidz_student_targets")
          .select("*")
          .eq("student_id", student.id)
          .eq("target_type", "tahfidz")
          .order("created_at", { ascending: false });
        if (activeYearId) tahfidzTargetQuery = tahfidzTargetQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) tahfidzTargetQuery = tahfidzTargetQuery.eq("semester_id", activeSemesterId);
        const { data: tahfidzTargetData } = await tahfidzTargetQuery;
        setTahfidzTargets(tahfidzTargetData || []);

        let tahsinTargetQuery = supabaseClient
          .from("tahsin_student_targets")
          .select("*")
          .eq("student_id", student.id)
          .eq("target_type", "tahsin")
          .order("created_at", { ascending: false });
        if (activeYearId) tahsinTargetQuery = tahsinTargetQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) tahsinTargetQuery = tahsinTargetQuery.eq("semester_id", activeSemesterId);
        const { data: tahsinTargetData } = await tahsinTargetQuery;
        setTahsinTargets(tahsinTargetData || []);

        let assessmentsQuery = supabaseClient
          .from("quran_assessments")
          .select("*, employees(full_name)")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        if (activeYearId) assessmentsQuery = assessmentsQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) assessmentsQuery = assessmentsQuery.eq("semester_id", activeSemesterId);
        const { data: assessmentsData } = await assessmentsQuery;
        setAssessments(assessmentsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [student.id, student.class_id, activeYearId, activeSemesterId]);

  const tahfidzRecords = records.filter((record) => record.record_type === "tahfidz");
  const tahsinRecords = records.filter((record) => record.record_type === "tahsin");
  const tahfidzAssessments = assessments.filter((item) => item.assessment_type === "tahfidz_juz" || item.assessment_type === "tasmi");
  const tahsinAssessments = assessments.filter((item) => item.assessment_type === "tahsin_jilid");
  const followUpCount = records.filter((record) => record.fluency_score === "Mengulang").length +
    assessments.filter((item) => item.status === "Mengulang" || item.status === "Lulus Bersyarat").length;

  const targetCards = useMemo(() => {
    const personalTahfidz = tahfidzTargets.map((target) => ({ ...target, source: "Target Tahfidz", tone: "emerald", records: tahfidzRecords }));
    const personalTahsin = tahsinTargets.map((target) => ({ ...target, source: "Target Tahsin", tone: "blue", records: tahsinRecords }));
    const classTargetCards = classTargets.map((target) => ({
      ...target,
      source: target.target_type === "tahfidz" ? "Target Kelas Tahfidz" : "Target Kelas Tahsin",
      tone: target.target_type === "tahfidz" ? "emerald" : "blue",
      records: target.target_type === "tahfidz" ? tahfidzRecords : tahsinRecords,
    }));
    return [...personalTahfidz, ...personalTahsin, ...classTargetCards];
  }, [classTargets, tahfidzRecords, tahfidzTargets, tahsinRecords, tahsinTargets]);

  const getProgress = (target: any) => {
    const units = estimateTargetUnits(target);
    return Math.min(100, Math.round((target.records.length / Math.max(units, 1)) * 100));
  };

  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Memuat data Al-Qur'an...</div>;

  return (
    <div className="p-4 space-y-6">
      <section className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Perkembangan Qur'an</h2>
          <p className="text-emerald-100 text-sm">Tahfidz, Tahsin, target, jurnal harian, dan hasil ujian {student.full_name?.split(" ")[0]}.</p>
        </div>
        <BookOpen className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
      </section>

      <section className="grid grid-cols-4 gap-3">
        {[
          { label: "Tahfidz", value: tahfidzRecords.length, icon: BookOpen, className: "text-emerald-700 bg-emerald-50" },
          { label: "Tahsin", value: tahsinRecords.length, icon: ClipboardCheck, className: "text-blue-700 bg-blue-50" },
          { label: "Ujian", value: assessments.length, icon: Award, className: "text-purple-700 bg-purple-50" },
          { label: "Follow-up", value: followUpCount, icon: AlertTriangle, className: "text-amber-700 bg-amber-50" },
        ].map(({ label, value, icon: Icon, className }) => (
          <div key={label} className="rounded-2xl border bg-white p-3 text-center shadow-sm">
            <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${className}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-[11px] font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["overview", "Ringkasan"],
          ["tahfidz", "Tahfidz"],
          ["tahsin", "Tahsin"],
          ["assessments", "Ujian"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as any)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === key ? "bg-emerald-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </section>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Target className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-900">Target Aktif</h3>
            </div>
            {targetCards.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">
                Belum ada target Qur'an aktif yang ditampilkan untuk semester ini.
              </div>
            ) : (
              <div className="grid gap-3">
                {targetCards.map((target) => {
                  const progress = getProgress(target);
                  const isTahfidz = target.tone === "emerald";
                  return (
                    <div key={`${target.source}-${target.id}`} className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isTahfidz ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {target.source}
                          </span>
                          <h4 className="mt-2 font-bold text-gray-800">{target.description}</h4>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{target.target_amount} {target.amount_unit}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span>Progres estimasi dari jurnal</span>
                          <span className={isTahfidz ? "text-emerald-600" : "text-blue-600"}>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 rounded-full ${isTahfidz ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {followUpCount > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-amber-900">Perlu pendampingan di rumah</h3>
                  <p className="mt-1 text-sm text-amber-800">
                    Ada catatan mengulang atau kelulusan bersyarat. Dampingi latihan sesuai catatan ustadz/ustadzah dan pantau jurnal berikutnya.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "tahfidz" && <RecordList title="Mutaba'ah Hafalan (Tahfidz)" records={tahfidzRecords} empty="Belum ada catatan setoran hafalan." />}
      {activeTab === "tahsin" && <RecordList title="Perkembangan Bacaan (Tahsin)" records={tahsinRecords} empty="Belum ada catatan Tahsin." />}

      {activeTab === "assessments" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Hasil Ujian Qur'an</h3>
          </div>
          {assessments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">
              Belum ada hasil ujian Qur'an untuk semester ini.
            </div>
          ) : (
            <div className="grid gap-3">
              {assessments.map((assessment) => {
                const isTahsin = assessment.assessment_type === "tahsin_jilid";
                return (
                  <div key={assessment.id} className="bg-gradient-to-r from-purple-50 to-white rounded-xl shadow-sm border border-purple-100 p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold text-purple-900">{assessment.title}</h4>
                        <p className="text-xs font-medium text-purple-600 mt-0.5">
                          {isTahsin ? "Ujian Kenaikan Jilid Tahsin" : "Munaqosyah Tahfidz"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-purple-700">{assessment.score}</div>
                        {assessment.predicate && <div className="text-[10px] font-bold uppercase tracking-wide text-purple-500 bg-purple-100 px-2 py-0.5 rounded mt-1">{assessment.predicate}</div>}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 border-t border-purple-100/50 pt-2 flex flex-wrap items-center justify-between gap-2">
                      <span>{new Date(assessment.date).toLocaleDateString("id-ID")}</span>
                      <span className={`rounded-md border px-2 py-1 font-bold ${assessmentClass(assessment.status)}`}>{assessment.status || "Lulus"}</span>
                      <span>Penguji: {assessment.employees?.full_name || "Ustadz/ah"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "overview" && assessments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Ringkasan Ujian</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-white p-4 text-center">
              <p className="text-2xl font-black text-emerald-700">{tahfidzAssessments.length}</p>
              <p className="text-xs font-semibold text-gray-500">Ujian Tahfidz</p>
            </div>
            <div className="rounded-xl border bg-white p-4 text-center">
              <p className="text-2xl font-black text-blue-700">{tahsinAssessments.length}</p>
              <p className="text-xs font-semibold text-gray-500">Ujian Tahsin</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const RecordList: React.FC<{ title: string; records: any[]; empty: string }> = ({ title, records, empty }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      {records.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">{empty}</div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <h4 className="font-bold text-lg text-emerald-700">{record.surah_or_jilid}</h4>
                  <p className="text-sm text-gray-600 font-medium">Ayat/Hal: {record.ayat_or_page}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${fluencyClass(record.fluency_score)}`}>
                  {record.fluency_score}
                </span>
              </div>
              {(record.tajwid_score || record.makhroj_score) && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 p-2 border"><strong>Tajwid:</strong> {record.tajwid_score || "-"}</div>
                  <div className="rounded-lg bg-gray-50 p-2 border"><strong>Makhraj:</strong> {record.makhroj_score || "-"}</div>
                </div>
              )}
              {record.notes && (
                <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                  <span className="font-bold block mb-1">Catatan Ustadz/Ustadzah:</span>
                  {record.notes}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 font-medium border-t pt-2">
                <span>{new Date(record.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {record.employees?.full_name || "Ustadz/ah"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
