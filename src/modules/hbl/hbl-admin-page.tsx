import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HblAdminSettings } from "./hbl-admin-settings";
import { HblMeetingManager } from "./hbl-meeting-manager";

export const HblAdminPage: React.FC = () => (
  <div className="space-y-6 pb-10">
    <PageHeader
      title="LMS Homebased Learning"
      description="Ruang kerja LMS: program per unit dan tahun ajaran, pertemuan, live meet, multi materi, worksheet, serta home project."
    />
    <HblAdminSettings />
    <HblMeetingManager />
  </div>
);
