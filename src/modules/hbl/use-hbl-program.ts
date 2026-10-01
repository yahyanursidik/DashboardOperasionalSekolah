/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

const db = supabaseClient as any;

/** Groups (tema/pekan), meetings, activities and roster of one HBL program. */
export function useHblProgram(programId: string | undefined) {
  const [groups, setGroups] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    const [groupResult, meetingResult, rosterResult] = await Promise.all([
      db.from("hbl_learning_weeks").select("*").eq("program_id", programId).order("week_number"),
      db.from("hbl_meetings").select("*, subjects(id,name)").eq("program_id", programId).order("meeting_date", { nullsFirst: false }).order("start_time", { nullsFirst: false }).order("meeting_number"),
      db.from("hbl_program_students").select("student_id, students(id,full_name,nickname,class_id,unit_id)").eq("program_id", programId),
    ]);
    const meetingRows = meetingResult.data || [];
    const activityResult = meetingRows.length
      ? await db.from("hbl_activities").select("id,meeting_id,title,status").in("meeting_id", meetingRows.map((row: any) => row.id))
      : { data: [], error: null };
    const error = groupResult.error || meetingResult.error || rosterResult.error || activityResult.error;
    if (error) toast.error("Data program belum dapat dimuat", { description: error.message });
    setGroups(groupResult.data || []);
    setMeetings(meetingRows);
    setActivities(activityResult.data || []);
    setRoster((rosterResult.data || []).map((row: any) => row.students).filter(Boolean).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
    setLoading(false);
  }, [programId]);

  useEffect(() => { void reload(); }, [reload]);

  return { groups, meetings, activities, roster, loading, reload };
}

export const isMeetingPublished = (meeting: any) => Boolean(meeting?.is_published && meeting?.status === "published");
export const jakartaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
