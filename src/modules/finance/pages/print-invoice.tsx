import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useOne } from "@refinedev/core";
import { Receipt, Loader2, Printer, Building, QrCode, MessageCircle } from "lucide-react";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";

export const PrintInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { financeBankName, financeAccountNumber, financeAccountName, financeWaNumber } = useSystemSettings();

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
  const invoiceNumber = String(invoice?.id || '').split('-')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none p-8 sm:p-12 border print:border-none relative overflow-hidden">
        
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.05]">
          <span className={`transform -rotate-45 text-9xl font-black ${invoice?.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
            {invoice?.status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}
          </span>
        </div>

        {/* Action Button (Hidden on Print) */}
        <div className="absolute top-4 right-4 print:hidden z-10">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors">
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6 relative z-10">
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
              Status: <span className={`uppercase px-2 py-0.5 rounded text-xs font-bold ml-1 ${invoice?.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{invoice?.status === 'paid' ? 'Lunas' : 'Belum Lunas'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">No. Tagihan: <span className="font-mono text-gray-900 font-semibold">{invoiceNumber}</span></p>
            <p className="text-xs text-gray-500">Tanggal: {new Date(invoice?.created_at || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 relative z-10">
          <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Ditagihkan Kepada:</h2>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="font-bold text-gray-900 text-lg">{studentName}</p>
            {studentInfo && <p className="text-sm text-gray-600 mt-1">{studentInfo}</p>}
          </div>
        </div>

        {/* Invoice Items */}
        <div className="relative z-10">
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
        </div>

        {/* Payment Instructions (Only if not paid) */}
        {invoice?.status !== 'paid' && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-dashed z-10 relative print:break-inside-avoid">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" /> Transfer Bank
              </h3>
              <div className="space-y-1.5 text-sm text-gray-600 bg-white p-3 rounded border">
                <p>Bank: <strong className="text-gray-900">{financeBankName || "BSI (Bank Syariah Indonesia)"}</strong></p>
                <p>No. Rekening: <strong className="text-gray-900 text-lg tracking-wider">{financeAccountNumber || "1234567890"}</strong></p>
                <p>Atas Nama: <strong className="text-gray-900">{financeAccountName || "Yayasan Pendidikan TSLS"}</strong></p>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 sm:justify-end w-full">
                <QrCode className="w-4 h-4 text-primary" /> Pembayaran QRIS
              </h3>
              <div className="bg-white p-2 rounded-lg border w-32 h-32 flex items-center justify-center text-center shadow-sm">
                <div className="flex flex-col items-center opacity-70">
                   <QrCode className="w-16 h-16 text-gray-800" />
                   <span className="text-[10px] font-bold mt-1 text-gray-500">SCAN DI SINI</span>
                </div>
              </div>
            </div>
            
            <div className="sm:col-span-2 pt-5 border-t border-gray-200 mt-2 text-center">
              <p className="text-sm text-gray-600 mb-4 font-medium">Setelah melakukan pembayaran, harap konfirmasi melalui WhatsApp Bagian Keuangan dengan melampirkan bukti transfer:</p>
              <a 
                href={`https://wa.me/${financeWaNumber}?text=Halo%20Bagian%20Keuangan%20TSLS,%20saya%20ingin%20mengkonfirmasi%20pembayaran%20untuk%20Invoice%20${invoiceNumber}%20atas%20nama%20${encodeURIComponent(studentName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#20b858] transition-colors shadow-sm print:hidden"
              >
                <MessageCircle className="w-5 h-5" /> Konfirmasi via WhatsApp
              </a>
              <div className="hidden print:block font-bold text-sm text-gray-800 border p-3 rounded-lg bg-white">
                Nomor WA Keuangan: {financeWaNumber}
              </div>
            </div>
          </div>
        )}

        {/* Footer Notes */}
        <div className="mt-12 text-center text-xs text-gray-500 border-t pt-8 relative z-10">
          <p className="font-bold text-gray-600 mb-1">Terima kasih atas pembayaran Anda.</p>
          <p>Jika ada pertanyaan terkait tagihan ini, silakan hubungi bagian Administrasi/Keuangan TSLS.</p>
          <p className="mt-2 text-[10px] text-gray-400">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
};
