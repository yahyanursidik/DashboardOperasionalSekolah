import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { CurriculumSectionNav } from "../curriculum/components/CurriculumSectionNav";
import { HblAdminSettings } from "./hbl-admin-settings";

export const HblAdminPage: React.FC = () => (
  <div className="space-y-6 pb-10">
    <PageHeader
      title="LMS Homebased Learning"
      description="Kelola program pembelajaran rumah per semester, materi keluarga, peserta, serta tindak lanjut laporan orang tua."
    />
    <CurriculumSectionNav />
    <HblAdminSettings />
  </div>
);
