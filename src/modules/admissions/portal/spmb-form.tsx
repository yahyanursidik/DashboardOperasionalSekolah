import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save, Lock } from "lucide-react";
import { getSpmbSettings, getPaudIndicators, getSdReadinessIndicators } from "../mock";

export const SpmbForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("SD");
  const [admissionPath, setAdmissionPath] = useState<'Siswa Baru'|'Siswa Pindahan'>('Siswa Baru');
  const [paudTarget, setPaudTarget] = useState<'KB'|'TK-A'|'TK-B'>('TK-A');

  const settings = getSpmbSettings();
  const paudIndicators = getPaudIndicators();
  const sdIndicators = getSdReadinessIndicators();
  
  const isPaud = selectedUnit === 'PAUD/TK';
  const isSd = selectedUnit === 'SD';
  const totalSteps = (isPaud || isSd) ? 4 : 3;

  if (!settings.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Lock className="w-12 h-12" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-3xl font-bold text-slate-800">Pendaftaran Ditutup</h2>
          <p className="text-slate-500 leading-relaxed">
            Formulir pendaftaran saat ini ditutup. Anda tidak dapat mengisi atau mengirimkan data.
          </p>
        </div>
        <Link to="/spmb" className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Kembali ke Dashboard SPMB
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        
        {/* Stepper Header */}
        <div className="bg-muted/30 border-b px-4 md:px-8 py-4 flex justify-between items-center overflow-x-auto gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <span className={`text-sm font-semibold hidden md:block ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Biodata</span>
          </div>
          <div className="h-0.5 flex-1 min-w-[20px] bg-border"></div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className={`text-sm font-semibold hidden md:block ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Orang Tua</span>
          </div>
          <div className="h-0.5 flex-1 min-w-[20px] bg-border"></div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
            <span className={`text-sm font-semibold hidden md:block ${step >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Asal Sekolah</span>
          </div>
          {(isPaud || isSd) && (
            <>
              <div className="h-0.5 flex-1 min-w-[20px] bg-border"></div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>4</div>
                <span className={`text-sm font-semibold hidden md:block ${step >= 4 ? 'text-foreground' : 'text-muted-foreground'}`}>{isPaud ? 'Observasi' : 'Kesiapan'}</span>
              </div>
            </>
          )}
        </div>

        <div className="p-4 md:p-8">
          <form className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-xl font-bold mb-4">Biodata Calon Siswa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-blue-700">1. Pilih Jenjang yang Dituju</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['PAUD/TK', 'SD', 'SMP', 'SMA'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setSelectedUnit(unit)}
                          className={`py-3 px-2 md:px-4 border rounded-xl font-bold transition-all text-sm md:text-base ${selectedUnit === unit ? 'bg-blue-50 border-blue-600 text-blue-700 ring-2 ring-blue-200' : 'bg-white text-muted-foreground hover:bg-muted/50'}`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {isPaud ? (
                    <div className="space-y-2 md:col-span-2 animate-in fade-in duration-300">
                      <label className="text-sm font-medium text-purple-700">Pilih Kelompok Usia Target</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['KB', 'TK-A', 'TK-B'].map((target) => (
                          <button
                            key={target}
                            type="button"
                            onClick={() => setPaudTarget(target as any)}
                            className={`py-2 px-4 border rounded-lg font-medium transition-all text-sm ${paudTarget === target ? 'bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-200' : 'bg-white text-muted-foreground hover:bg-muted/50'}`}
                          >
                            {target}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 md:col-span-2 animate-in fade-in duration-300">
                      <label className="text-sm font-medium text-amber-700">Jalur Pendaftaran</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Siswa Baru', 'Siswa Pindahan'].map((path) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => setAdmissionPath(path as any)}
                            className={`py-2 px-4 border rounded-lg font-medium transition-all text-sm ${admissionPath === path ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200' : 'bg-white text-muted-foreground hover:bg-muted/50'}`}
                          >
                            {path}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium">Nama Lengkap</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Sesuai Akta Kelahiran" />
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium">NIK</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="16 Digit NIK" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tempat Lahir</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tanggal Lahir</label>
                    <input type="date" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Alamat Lengkap</label>
                    <textarea rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Jalan, RT/RW, Kelurahan"></textarea>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                
                {/* Bagian Ayah */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800 border-b pb-2">Data Ayah Kandung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama Ayah</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nama Lengkap Ayah" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">NIK Ayah</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="16 Digit NIK" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pendidikan Terakhir Ayah</label>
                      <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
                        <option>Pilih Pendidikan</option>
                        <option>SD/Sederajat</option>
                        <option>SMP/Sederajat</option>
                        <option>SMA/Sederajat</option>
                        <option>D3 / Sarjana Muda</option>
                        <option>S1 / Sarjana</option>
                        <option>S2 / Magister</option>
                        <option>S3 / Doktor</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pekerjaan Ayah</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Pekerjaan / Profesi" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Penghasilan Rata-rata Ayah</label>
                      <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
                        <option>Pilih Penghasilan</option>
                        <option>Kurang dari Rp 2.000.000</option>
                        <option>Rp 2.000.000 - Rp 5.000.000</option>
                        <option>Rp 5.000.000 - Rp 10.000.000</option>
                        <option>Rp 10.000.000 - Rp 20.000.000</option>
                        <option>Lebih dari Rp 20.000.000</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Nomor WhatsApp Ayah</label>
                      <input type="tel" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="08..." />
                    </div>
                  </div>
                </div>

                {/* Bagian Ibu */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-800 border-b pb-2">Data Ibu Kandung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama Ibu</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nama Lengkap Ibu" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">NIK Ibu</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="16 Digit NIK" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pendidikan Terakhir Ibu</label>
                      <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
                        <option>Pilih Pendidikan</option>
                        <option>SD/Sederajat</option>
                        <option>SMP/Sederajat</option>
                        <option>SMA/Sederajat</option>
                        <option>D3 / Sarjana Muda</option>
                        <option>S1 / Sarjana</option>
                        <option>S2 / Magister</option>
                        <option>S3 / Doktor</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pekerjaan Ibu</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Pekerjaan / Profesi (Cth: Ibu Rumah Tangga)" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Penghasilan Rata-rata Ibu</label>
                      <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
                        <option>Pilih Penghasilan</option>
                        <option>Tidak Berpenghasilan</option>
                        <option>Kurang dari Rp 2.000.000</option>
                        <option>Rp 2.000.000 - Rp 5.000.000</option>
                        <option>Rp 5.000.000 - Rp 10.000.000</option>
                        <option>Rp 10.000.000 - Rp 20.000.000</option>
                        <option>Lebih dari Rp 20.000.000</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Nomor WhatsApp Ibu</label>
                      <input type="tel" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="08..." />
                    </div>
                  </div>
                </div>

                {/* Bagian Alamat Rumah */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-800 border-b pb-2">Informasi Tempat Tinggal</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alamat Lengkap Domisili</label>
                      <textarea rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos"></textarea>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tautan (Link) Google Maps Rumah</label>
                      <div className="flex gap-2">
                        <input type="url" className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm" placeholder="https://maps.app.goo.gl/..." />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Tempelkan link Google Maps alamat rumah Anda untuk mempermudah survei atau kunjungan guru.</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-xl font-bold mb-1">Data Asal Sekolah</h3>
                {isPaud ? (
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-sm">
                    <strong>Catatan untuk PAUD/TK:</strong> Karena Anda mendaftar ke jenjang PAUD/TK, pengisian Asal Sekolah bersifat opsional. Anda dapat langsung menyimpan dan melewati bagian ini jika belum pernah bersekolah.
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">Silakan isi data sekolah atau madrasah Anda sebelumnya.</p>
                )}
                
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {!isPaud && admissionPath === 'Siswa Pindahan' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4 mb-4">
                      <h4 className="font-bold text-amber-800">Detail Pindahan</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Pindah ke Kelas Berapa?</label>
                          <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Cth: Kelas 8 / Kelas 11 MIPA" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Alasan Pindah</label>
                          <textarea rows={2} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Jelaskan alasan pindah dari sekolah lama..."></textarea>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Asal Sekolah {!isPaud && admissionPath === 'Siswa Pindahan' ? <span className="text-red-500">*</span> : '(Opsional)'}</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Cth: SDN 01 Pagi / Biarkan kosong jika tidak ada" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">NPSN Sekolah {!isPaud && admissionPath === 'Siswa Pindahan' ? <span className="text-red-500">*</span> : '(Opsional)'}</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">NISN Siswa {!isPaud && admissionPath === 'Siswa Pindahan' ? <span className="text-red-500">*</span> : '(Opsional)'}</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (isPaud || isSd) && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-xl font-bold mb-1">
                  {isPaud ? 'Checklist Observasi Anak' : 'Checklist Kesiapan Bersekolah SD'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {isPaud 
                    ? 'Penilaian ini bersifat sebagai informasi awal bagi guru untuk mengetahui tingkat perkembangan anak Anda.'
                    : 'Penilaian ini untuk melihat sejauh mana kesiapan dasar calon siswa dalam mengikuti proses pembelajaran di tingkat Sekolah Dasar.'
                  }
                </p>
                
                <div className="space-y-4 border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b grid grid-cols-12 gap-4 font-semibold text-sm">
                    <div className="col-span-6 md:col-span-6">Indikator {isPaud ? 'Perkembangan' : 'Kesiapan'}</div>
                    <div className="col-span-6 md:col-span-6 grid grid-cols-3 text-center text-xs md:text-sm">
                      <div>Belum Bisa</div>
                      <div>Mulai Bisa</div>
                      <div>Sudah Bisa</div>
                    </div>
                  </div>
                  
                  {(isPaud ? paudIndicators : sdIndicators).map((indicator, idx) => (
                    <div key={idx} className="px-4 py-4 border-b last:border-0 grid grid-cols-12 gap-4 items-center hover:bg-muted/20 transition-colors">
                      <div className="col-span-6 md:col-span-6 text-sm font-medium">{indicator}</div>
                      <div className="col-span-6 md:col-span-6 grid grid-cols-3 justify-items-center">
                        <input type="radio" name={`ind-${idx}`} className="w-4 h-4 text-primary" />
                        <input type="radio" name={`ind-${idx}`} className="w-4 h-4 text-primary" defaultChecked={idx % 2 === 0} />
                        <input type="radio" name={`ind-${idx}`} className="w-4 h-4 text-primary" defaultChecked={idx % 2 !== 0} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="bg-muted/30 border-t px-4 md:px-8 py-4 flex justify-between items-center">
          <button 
            type="button" 
            onClick={() => setStep(s => Math.max(1, s - 1))}
            className={`px-4 py-2 text-sm font-medium border bg-white rounded-lg hover:bg-muted transition-colors ${step === 1 ? 'invisible' : ''}`}
          >
            Sebelumnya
          </button>
          
          {step < totalSteps ? (
            <button 
              type="button" 
              onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <Link 
              to="/spmb" 
              className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Simpan & Selesai
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
