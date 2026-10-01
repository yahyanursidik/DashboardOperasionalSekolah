/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

const db = supabaseClient as any;

export type HblSubmissionItem = {
  key: string;
  table: "hbl_activity_submissions" | "hbl_home_project_submissions";
  row: any;
  studentName: string;
  parentName: string;
  label: string;
  meetingTitle: string;
  file: string | null;
  note: string | null;
};

/** Activity and home-project submissions for the given meetings. */
export function useHblSubmissions(meetings: any[]) {
  const [items, setItems] = useState<HblSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ids = meetings.map((meeting) => meeting.id).join(",");

  const reload = useCallback(async () => {
    const meetingIds = ids ? ids.split(",") : [];
    if (!meetingIds.length) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const titles = new Map(meetings.map((meeting) => [meeting.id, meeting.title]));
    const projectTitles = new Map(meetings.map((meeting) => [meeting.id, meeting.project_title]));
    const { data: activities } = await db.from("hbl_activities").select("id,title,meeting_id").in("meeting_id", meetingIds);
    const activityMap = new Map((activities || []).map((activity: any) => [activity.id, activity]));
    const [submissionResult, projectResult] = await Promise.all([
      activityMap.size ? db.from("hbl_activity_submissions").select("*, students(full_name), parents(full_name)").in("activity_id", [...activityMap.keys()]) : Promise.resolve({ data: [] }),
      db.from("hbl_home_project_submissions").select("*, students(full_name), parents(full_name)").in("meeting_id", meetingIds),
    ]);
    const error = submissionResult.error || projectResult.error;
    if (error) toast.error("Laporan keluarga belum dapat dimuat", { description: error.message });
    const rows: HblSubmissionItem[] = [
      ...(submissionResult.data || []).map((row: any) => {
        const activity: any = activityMap.get(row.activity_id);
        return {
          key: `a-${row.id}`, table: "hbl_activity_submissions" as const, row,
          studentName: row.students?.full_name || "-", parentName: row.parents?.full_name || "Orang tua",
          label: activity?.title || "Kegiatan", meetingTitle: titles.get(activity?.meeting_id) || "",
          file: row.evidence_url, note: row.parent_note,
        };
      }),
      ...(projectResult.data || []).map((row: any) => ({
        key: `p-${row.id}`, table: "hbl_home_project_submissions" as const, row,
        studentName: row.students?.full_name || "-", parentName: row.parents?.full_name || "Orang tua",
        label: `Home project: ${projectTitles.get(row.meeting_id) || "project"}`, meetingTitle: titles.get(row.meeting_id) || "",
        file: row.submission_url, note: row.notes,
      })),
    ].sort((a, b) => String(b.row.submitted_at).localeCompare(String(a.row.submitted_at)));
    setItems(rows);
    setLoading(false);
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void reload(); }, [reload]);
  const pendingCount = items.filter((item) => item.row.status === "submitted").length;
  return { items, loading, reload, pendingCount };
}
