import React, { useState } from "react";
import { useTable, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Inbox, Plus, Edit, Trash2, Send, Search, Eye, FileSignature } from "lucide-react";

export const IncomingMailList: React.FC = () => {
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(q);
  };

  const filters: any[] = [{ field: "type", operator: "eq", value: "incoming" }];
  if (searchQuery) {
    filters.push({
      operator: "or",
      value: [
        { field: "mail_number", operator: "ilike", value: `%${searchQuery}%` },
        { field: "title", operator: "ilike", value: `%${searchQuery}%` },
        { field: "sender", operator: "ilike", value: `%${searchQuery}%` }
      ]
    });
  }

  const { tableQueryResult } = useTable({
    resource: "mail_records",
    filters: { permanent: filters },
    sorters: { initial: [{ field: "received_date", order: "desc" }] }
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
        title="Surat Masuk"
        description="Buku agenda untuk mencatat dan mengelola surat yang diterima."
        action={
          <div className="flex gap-2">
            <Link
              to="/mail"
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              Kembali
            </Link>
            <button
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
              onClick={() => alert('Fitur form tambah surat belum diimplementasi di demo ini.')}
            >
              <Plus className="w-4 h-4" /> Catat Surat Masuk
            </button>
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
              placeholder="Cari nomor surat, perihal, atau pengirim..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors">
            Cari
          </button>
        </form>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data surat masuk...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Nomor & Tanggal Surat</th>
                  <th className="px-6 py-4">Pengirim</th>
                  <th className="px-6 py-4">Perihal</th>
                  <th className="px-6 py-4">Tgl Diterima</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mails.map((mail) => (
                  <tr key={mail.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{mail.mail_number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatDate(mail.mail_date)}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{mail.sender}</td>
                    <td className="px-6 py-4">{mail.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(mail.received_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                        mail.status === 'dispositioned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {mail.status === 'dispositioned' ? 'Telah Didisposisi' : 'Belum Diproses'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          title="Buat Disposisi"
                          onClick={() => alert('Fitur disposisi belum diimplementasi di demo ini.')}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <FileSignature className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Hapus surat ini?')) deleteMail({ resource: "mail_records", id: mail.id as string }) }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {mails.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Belum ada surat masuk.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
