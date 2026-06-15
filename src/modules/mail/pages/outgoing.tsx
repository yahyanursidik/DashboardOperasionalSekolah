import React, { useState } from "react";
import { useTable, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Send, Plus, Trash2, Search } from "lucide-react";

export const OutgoingMailList: React.FC = () => {
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const filters: any[] = [{ field: "type", operator: "eq", value: "outgoing" }];
  if (searchQuery) {
    filters.push({
      operator: "or",
      value: [
        { field: "mail_number", operator: "ilike", value: `%${searchQuery}%` },
        { field: "title", operator: "ilike", value: `%${searchQuery}%` },
        { field: "recipient", operator: "ilike", value: `%${searchQuery}%` }
      ]
    });
  }

  const { tableQueryResult } = useTable({
    resource: "mail_records",
    filters: { permanent: filters },
    sorters: { initial: [{ field: "mail_date", order: "desc" }] }
  });

  const { mutate: deleteMail } = useDelete();

  const mails = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surat Keluar"
        description="Buku agenda untuk mencatat nomor surat dan mengelola surat keluar."
        action={
          <div className="flex gap-2">
            <Link
              to="/mail"
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              Kembali
            </Link>
            <Link
              to="/mail/outgoing/create"
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Catat Surat Keluar
            </Link>
          </div>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor surat, perihal, atau tujuan..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors">
            Cari
          </button>
        </form>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data surat keluar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Nomor & Tanggal Surat</th>
                  <th className="px-6 py-4">Tujuan / Penerima</th>
                  <th className="px-6 py-4">Perihal</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mails.map((mail) => (
                  <tr key={mail.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-emerald-600">{mail.mail_number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatDate(mail.mail_date)}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{mail.recipient}</td>
                    <td className="px-6 py-4">{mail.title}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { if(confirm('Hapus surat ini?')) deleteMail({ resource: "mail_records", id: mail.id as string }) }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {mails.length === 0 && (
                  <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">Belum ada surat keluar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
