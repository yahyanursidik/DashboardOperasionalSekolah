import React from "react";
import { X } from "lucide-react";

/** Right-hand panel for forms and meeting details, so the planner stays readable. */
export const HblDrawer: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ open, title, subtitle, onClose, wide, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Tutup panel" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <section role="dialog" aria-modal="true" aria-label={title} className={`relative flex h-full w-full flex-col bg-background shadow-2xl ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} title="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted hover:bg-muted/70"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
};
