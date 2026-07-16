/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface SpmbPortalContextValue {
  user: User;
  applicant: any | null;
  loading: boolean;
  refreshApplicant: () => Promise<void>;
}

export const SpmbPortalContext = createContext<SpmbPortalContextValue | null>(null);

export const useSpmbPortal = () => {
  const context = useContext(SpmbPortalContext);
  if (!context) throw new Error("useSpmbPortal harus digunakan di dalam SpmbLayout.");
  return context;
};
