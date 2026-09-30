import React from "react";
import type { ReportSubjectOption } from "./report-subjects";

type RegisterFn = (name: string) => Record<string, unknown>;

export const ItemSubjectSelect: React.FC<{ register: RegisterFn; name: string; subjects: ReportSubjectOption[] }> = ({ register, name, subjects }) => (
  <label className="pl-7 flex items-center gap-2 text-xs text-muted-foreground">
    <span className="shrink-0 font-medium">Sumber nilai</span>
    <select
      {...register(name)}
      className="flex-1 max-w-sm px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
      title="Item numerik yang ditautkan ke mapel akan menawarkan nilai akhir Gradebook saat guru mengisi rapor."
    >
      <option value="">Input manual</option>
      {subjects.map((subject) => (
        <option key={subject.id} value={subject.id}>Gradebook: {subject.name}</option>
      ))}
    </select>
  </label>
);
