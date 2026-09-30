import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HblWorkspace } from "./hbl-workspace";

export const HblAdminPage: React.FC = () => (
  <div className="space-y-6 pb-10">
    <PageHeader
      title="Preschool HBL · Pertemuan Tematik"
      description="Homebased learning KB/TK disusun per tema dan subtema: setiap pertemuan memuat live meet, kegiatan main bersama orang tua, media pendukung, lembar kerja, home project, kehadiran, dan catatan perkembangan anak."
    />
    <HblWorkspace canManagePrograms />
  </div>
);
