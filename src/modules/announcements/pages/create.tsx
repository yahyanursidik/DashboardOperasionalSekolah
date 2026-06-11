import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { AnnouncementForm } from "../components/announcement-form";

export const AnnouncementCreate: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Pengumuman Baru"
        description="Pesan akan ditujukan ke penerima yang dipilih."
      />
      <AnnouncementForm action="create" />
    </div>
  );
};

export const AnnouncementEdit: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Pengumuman"
        description="Perbarui informasi atau status pengumuman."
      />
      <AnnouncementForm action="edit" />
    </div>
  );
};
