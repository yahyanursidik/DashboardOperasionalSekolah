import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Mail, Send, Inbox, FileSignature } from "lucide-react";
import { useList, useGetIdentity } from "@refinedev/core";

export const MailDashboard: React.FC = () => {
  const { data: user } = useGetIdentity<any>();
  const currentUserId = user?.profile?.id;

  // Fetch metrics
  const { data: incomingData } = useList({
    resource: "mail_records",
    filters: [{ field: "type", operator: "eq", value: "incoming" }]
  });

  const { data: outgoingData } = useList({
    resource: "mail_records",
    filters: [{ field: "type", operator: "eq", value: "outgoing" }]
  });

  const { data: dispositionsData } = useList({
    resource: "mail_dispositions",
    filters: [
      { field: "to_user_id", operator: "eq", value: currentUserId },
      { field: "status", operator: "ne", value: "completed" }
    ],
    queryOptions: { enabled: !!currentUserId }
  });

  const incomingCount = incomingData?.total || 0;
  const outgoingCount = outgoingData?.total || 0;
  const pendingDispositionsCount = dispositionsData?.total || 0;

  const menus = [
    {
      title: "Buku Agenda Surat Masuk",
      description: "Pencatatan dan pengarsipan surat yang diterima oleh sekolah.",
      icon: Inbox,
      href: "/mail/incoming",
      color: "bg-blue-100 text-blue-600",
      count: incomingCount,
      label: "Surat"
    },
    {
      title: "Buku Agenda Surat Keluar",
      description: "Pencatatan nomor surat dan pengarsipan surat yang dikeluarkan.",
      icon: Send,
      href: "/mail/outgoing",
      color: "bg-emerald-100 text-emerald-600",
      count: outgoingCount,
      label: "Surat"
    },
    {
      title: "Tugas Disposisi Saya",
      description: "Daftar surat masuk yang didisposisikan kepada Anda untuk ditindaklanjuti.",
      icon: FileSignature,
      href: "/mail/dispositions",
      color: "bg-amber-100 text-amber-600",
      count: pendingDispositionsCount,
      label: "Tugas Pending"
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrasi Tata Usaha"
        description="Kelola Buku Agenda Surat Masuk, Surat Keluar, dan Alur Disposisi Pegawai."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menus.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link
              key={menu.href}
              to={menu.href}
              className="bg-card border rounded-xl p-6 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-lg ${menu.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">{menu.count}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{menu.label}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {menu.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {menu.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
