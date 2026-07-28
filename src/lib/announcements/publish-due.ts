import { supabaseClient } from "../supabase/client";

export const publishDueAnnouncements = async (): Promise<number> => {
  const { data, error } = await supabaseClient.rpc("publish_due_announcements");
  if (error) return 0;
  return Number(data || 0);
};
