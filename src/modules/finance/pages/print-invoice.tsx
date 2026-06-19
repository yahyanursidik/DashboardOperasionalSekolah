import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Receipt, Loader2, Printer } from "lucide-react";

export const PrintInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: invoiceData, isLoading } = useOne({
    resource: "student_invoices",
    id: id || "",
    meta: {
      select: "*, students(full_name, nisn), external_students(full_name, school_origin)"
    },
    queryOptions: { enabled: !!id }
  });

  const invoice = invoiceData?.data;

  // Function to print
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-muted-foreground">Invoice tidak ditemukan.</div>
      </div>
    );
  }

  const studentName = invoice.students?.full_name || invoice.external_students?.full_name || "-";
  const studentInfo = invoice.students?.nisn ? `NISN: ${invoice.students.nisn}` : invoice.external_students?.school_origin ? `Asal Sekolah: ${invoice.external_students.school_origin}` : "";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto bg-white shadow-lg print:shadow-none p-8 sm:p-12 border print:border-none relative">
        
        {/* Action Button (Hidden on Print) */}
        <div className="absolute top-4 right-4 print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors">
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-sm text-gray-500">Yayasan Pendidikan TSLS</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900 mb-1">
              Status: <span className={`uppercase ${invoice?.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>{invoice?.status === 'paid' ? 'Lunas' : 'Belum Lunas'}</span>
            </div>
            <p className="text-xs text-gray-500">No. Tagihan: {String(invoice?.id || '').split('-')[0].toUpperCase()}</p>
            <p className="text-xs text-gray-500">Tanggal: {new Date(invoice?.created_at || Date.now()).toLocaleDateString('id-ID')}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Ditagihkan Kepada:</h2>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="font-bold text-gray-900 text-lg">{studentName}</p>
            {studentInfo && <p className="text-sm text-gray-600 mt-1">{studentInfo}</p>}
          </div>
        </div>

        {/* Invoice Items */}
        <table className="w-full text-left mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-3 text-sm font-bold text-gray-900">Deskripsi Tagihan</th>
              <th className="py-3 text-sm font-bold text-gray-900 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4">
                <p className="font-semibold text-gray-900">{invoice.title}</p>
                {invoice.description && <p className="text-sm text-gray-500 mt-1">{invoice.description}</p>}
                <p className="text-xs text-gray-400 mt-1">Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}</p>
              </td>
              <td className="py-4 text-right font-medium text-gray-900">
                Rp {Number(invoice.amount).toLocaleString('id-ID')}
              </td>
            </tr>
            {Number(invoice.discount) > 0 && (
              <tr className="border-b border-gray-100 text-green-600">
                <td className="py-3 text-sm text-right">Diskon</td>
                <td className="py-3 text-right font-medium">
                  - Rp {Number(invoice.discount).toLocaleString('id-ID')}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-4 text-right font-bold text-gray-900">Total Keseluruhan</td>
              <td className="py-4 text-right font-bold text-lg text-primary">
                Rp {(Number(invoice.amount) - Number(invoice.discount)).toLocaleString('id-ID')}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-right text-sm text-gray-600">Telah Dibayar</td>
              <td className="py-2 text-right text-sm font-semibold text-gray-900">
                Rp {Number(invoice.paid_amount).toLocaleString('id-ID')}
              </td>
            </tr>
            <tr className="border-t-2 border-gray-200">
              <td className="py-3 text-right font-bold text-gray-900">SISA TAGIHAN</td>
              <td className="py-3 text-right font-bold text-xl text-red-600">
                Rp {(Number(invoice.amount) - Number(invoice.discount) - Number(invoice.paid_amount)).toLocaleString('id-ID')}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Notes */}
        <div className="mt-12 text-center text-xs text-gray-500 border-t pt-8">
          <p>Terima kasih atas pembayaran Anda.</p>
          <p>Jika ada pertanyaan terkait tagihan ini, silakan hubungi bagian Administrasi/Keuangan TSLS.</p>
        </div>
      </div>
    </div>
  );
};
