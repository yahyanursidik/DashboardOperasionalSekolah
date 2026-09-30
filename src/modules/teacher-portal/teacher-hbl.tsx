import React from "react";
import { Laptop } from "lucide-react";
import { HblWorkspace } from "../hbl/hbl-workspace";

export const TeacherHbl: React.FC = () => (
  <div className="space-y-6 pb-10">
    <header className="border-b pb-5">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-violet-50 p-2 text-violet-700"><Laptop className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">Pertemuan HBL</h1>
          <p className="mt-1 text-sm text-muted-foreground">Susun tema, subtema, dan pertemuan untuk kelas Preschool HBL yang Anda ampu, lalu catat kehadiran dan perkembangan anak.</p>
        </div>
      </div>
    </header>
    <HblWorkspace canManagePrograms={false} />
  </div>
);
