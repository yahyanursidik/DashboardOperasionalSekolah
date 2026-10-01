import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HblWorkspace } from "./hbl-workspace";

export const HblAdminPage: React.FC = () => (
  <div className="space-y-6 pb-10">
    <PageHeader
      title="Homebased Learning"
      description="Pembelajaran dari rumah per kelas. Preschool memakai pola tematik (tema → pertemuan → kegiatan main); jenjang SD memakai pola per mata pelajaran."
    />
    <HblWorkspace canManagePrograms />
  </div>
);
