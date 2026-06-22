import React from 'react';

interface ReportCardPDFProps {
  reportData: any;
  scoresMap: Record<string, any>;
  homeroomNote: string;
  homeAdviceNote: string;
  principalNote: string;
}

export const ReportCardPDF = React.forwardRef<HTMLDivElement, ReportCardPDFProps>(
  ({ reportData, scoresMap, homeroomNote, homeAdviceNote, principalNote }, ref) => {
    
    if (!reportData) return null;

    const student = reportData.students || {};
    const period = reportData.report_periods || {};
    const classes = reportData.classes || {};
    const template = reportData.report_templates || {};
    
    const sortedSections = [...(template.sections || [])]
      .filter((s: any) => s.parent_visible !== false)
      .sort((a, b) => a.display_order - b.display_order);

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-[20mm] box-border" 
        style={{ 
          width: '210mm', 
          minHeight: '297mm', // Not exactly fixed height because a report can be multiple pages, html2canvas will capture the whole scrollHeight, and jspdf handles page splits if we do it right, but for simple MVP we capture one long image and auto-scale it or cut it. Wait, actually we usually want to let it grow.
          fontFamily: "'Times New Roman', Times, serif" 
        }}
      >
        {/* KOP SURAT (Header) */}
        <div className="flex items-center border-b-4 border-black pb-4 mb-6">
          <div className="w-24 h-24 bg-gray-200 flex items-center justify-center shrink-0 rounded-full border border-gray-400">
            <span className="text-gray-500 text-xs">LOGO</span>
          </div>
          <div className="flex-1 text-center px-4">
            <h1 className="text-2xl font-bold uppercase tracking-wider">Sekolah Dasar TSLS</h1>
            <p className="text-sm mt-1">Jl. Pendidikan No. 123, Kota Cerdas, Indonesia 12345</p>
            <p className="text-sm">Telp: (021) 1234567 | Email: info@tsls.sch.id | Web: www.tsls.sch.id</p>
          </div>
          <div className="w-24 h-24"></div> {/* Spacer for centering */}
        </div>

        {/* TITLE */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold uppercase underline">Laporan Hasil Belajar Peserta Didik</h2>
        </div>

        {/* STUDENT INFO */}
        <table className="w-full text-sm mb-8">
          <tbody>
            <tr>
              <td className="py-1 w-32 font-bold">Nama Peserta Didik</td>
              <td className="py-1 w-4">:</td>
              <td className="py-1">{student.full_name}</td>
              <td className="py-1 w-32 font-bold">Kelas</td>
              <td className="py-1 w-4">:</td>
              <td className="py-1">{classes.name}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold">NISN</td>
              <td className="py-1">:</td>
              <td className="py-1">{student.nisn || '-'}</td>
              <td className="py-1 font-bold">Semester</td>
              <td className="py-1">:</td>
              <td className="py-1">{period.semester_id === 1 ? '1 (Ganjil)' : period.semester_id === 2 ? '2 (Genap)' : '-'}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold">Nama Sekolah</td>
              <td className="py-1">:</td>
              <td className="py-1">SD TSLS</td>
              <td className="py-1 font-bold">Tahun Pelajaran</td>
              <td className="py-1">:</td>
              <td className="py-1">{period.academic_year_id}</td>
            </tr>
          </tbody>
        </table>

        {/* REPORT CONTENT */}
        {sortedSections.map((section: any) => {
          const items = [...(section.items || [])]
            .filter((i: any) => i.parent_visible !== false)
            .sort((a: any, b: any) => a.display_order - b.display_order);

          if (items.length === 0) return null;

          return (
            <div key={section.id} className="mb-6">
              <h3 className="font-bold text-md mb-2 bg-gray-100 px-2 py-1 border border-black uppercase">{section.title}</h3>
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black px-2 py-2 w-10 text-center">No</th>
                    <th className="border border-black px-2 py-2">Aspek Penilaian</th>
                    <th className="border border-black px-2 py-2 w-20 text-center">Nilai</th>
                    <th className="border border-black px-2 py-2 w-24 text-center">Predikat</th>
                    <th className="border border-black px-2 py-2 w-64 text-center">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const score = scoresMap[item.id] || {};
                    return (
                      <tr key={item.id}>
                        <td className="border border-black px-2 py-2 text-center align-top">{idx + 1}</td>
                        <td className="border border-black px-2 py-2 align-top font-medium">{item.name}</td>
                        <td className="border border-black px-2 py-2 text-center align-top">{score.score_numeric || '-'}</td>
                        <td className="border border-black px-2 py-2 text-center align-top">{score.score_predicate || '-'}</td>
                        <td className="border border-black px-2 py-2 align-top italic text-xs">{score.score_narrative || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* NARRATIVE NOTES */}
        <div className="mb-10 page-break-inside-avoid">
           <h3 className="font-bold text-md mb-2 bg-gray-100 px-2 py-1 border border-black uppercase">Catatan & Saran</h3>
           <table className="w-full text-sm border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-3 w-1/3 font-bold align-top">Catatan Wali Kelas</td>
                  <td className="border border-black px-3 py-3 align-top whitespace-pre-wrap">{homeroomNote || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-3 font-bold align-top">Saran Pendampingan di Rumah</td>
                  <td className="border border-black px-3 py-3 align-top whitespace-pre-wrap">{homeAdviceNote || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-3 font-bold align-top">Catatan Kepala Sekolah</td>
                  <td className="border border-black px-3 py-3 align-top whitespace-pre-wrap italic">{principalNote || '-'}</td>
                </tr>
              </tbody>
           </table>
        </div>

        {/* SIGNATURES */}
        <div className="flex justify-between mt-12 text-sm page-break-inside-avoid px-8">
          <div className="text-center">
            <p className="mb-16">Mengetahui,<br/>Orang Tua / Wali</p>
            <p className="font-bold underline">( ...................................... )</p>
          </div>
          <div className="text-center">
            <p className="mb-16">Kota Cerdas, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}<br/>Wali Kelas</p>
            <p className="font-bold underline">( Nama Wali Kelas )</p>
            <p>NIP. -</p>
          </div>
        </div>
        <div className="text-center mt-12 text-sm page-break-inside-avoid">
            <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
            <p className="font-bold underline">( Nama Kepala Sekolah )</p>
            <p>NIP. -</p>
        </div>

      </div>
    );
  }
);
