import React from "react";
import { Loader2 } from "lucide-react";

/** Placeholder while a lazily loaded page chunk downloads. */
export const PageLoader: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => (
  <div
    role="status"
    aria-label="Memuat halaman"
    className={`flex items-center justify-center ${fullScreen ? "min-h-screen bg-background" : "py-24"}`}
  >
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);
