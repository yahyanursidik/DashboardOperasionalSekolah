/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Crosshair, Loader2, MapPin, Pencil, Plus, Save, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { AttendanceShiftSettings } from "../components/attendance-shift-settings";

const EMPTY_SITE = {
  id: "",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius_meters: "150",
  accuracy_limit_meters: "100",
  notes: "",
  unitIds: [] as string[],
};

const DEFAULT_POLICY = {
  id: "",
  unit_id: "",
  name: "Kebijakan Presensi",
  require_geofence: false,
  allow_correction_request: true,
  check_in_open: "05:00",
  check_in_close: "10:00",
  default_start_time: "07:00",
  default_end_time: "15:00",
  grace_minutes: 10,
  early_departure_tolerance_minutes: 0,
  max_accuracy_meters: 100,
  is_active: true,
};

export const AttendanceSettings: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [siteForm, setSiteForm] = useState(EMPTY_SITE);
  const [policyUnitId, setPolicyUnitId] = useState("__global__");
  const [policyForm, setPolicyForm] = useState<any>(DEFAULT_POLICY);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [unitResult, siteResult, policyResult] = await Promise.all([
      supabaseClient.from("units").select("id,name").order("name"),
      supabaseClient.from("attendance_sites").select("*,attendance_site_units(unit_id,units(name))").order("name"),
      supabaseClient.from("attendance_policies").select("*").order("name"),
    ]);
    const error = unitResult.error || siteResult.error || policyResult.error;
    if (error) toast.error(error.message || "Konfigurasi absensi gagal dimuat.");
    setUnits(unitResult.data ?? []);
    setSites(siteResult.data ?? []);
    setPolicies(policyResult.data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    const unitId = policyUnitId === "__global__" ? null : policyUnitId;
    const existing = policies.find((policy) => policy.unit_id === unitId);
    const inherited = policies.find((policy) => !policy.unit_id);
    const source = existing || inherited || DEFAULT_POLICY;
    setPolicyForm({
      ...source,
      id: existing?.id || "",
      unit_id: unitId,
      name: existing?.name || (unitId ? `Kebijakan Presensi ${units.find((unit) => unit.id === unitId)?.name || "Unit"}` : "Kebijakan Presensi Lintas Unit"),
      check_in_open: String(source.check_in_open || "05:00").slice(0, 5),
      check_in_close: String(source.check_in_close || "10:00").slice(0, 5),
      default_start_time: String(source.default_start_time || "07:00").slice(0, 5),
      default_end_time: String(source.default_end_time || "15:00").slice(0, 5),
    });
  }, [policies, policyUnitId, units]);

  const enabledSiteCount = sites.filter((site) => site.is_active).length;
  const mappedUnitCount = useMemo(() => new Set(sites.flatMap((site) => (site.attendance_site_units ?? []).map((mapping: any) => mapping.unit_id))).size, [sites]);
  const configuredUnitCount = policies.filter((policy) => policy.is_active && policy.unit_id).length;
  const policyCoverage = useMemo(() => {
    const globalPolicy = policies.find((policy) => policy.is_active && !policy.unit_id);
    return units.map((unit) => {
      const explicitPolicy = policies.find((policy) => policy.is_active && policy.unit_id === unit.id);
      const effectivePolicy = explicitPolicy || globalPolicy;
      return { unit, explicitPolicy, effectivePolicy };
    });
  }, [policies, units]);
  const geofenceUnitCount = policyCoverage.filter(({ effectivePolicy }) => effectivePolicy?.require_geofence).length;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Perangkat tidak mendukung layanan lokasi.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setSiteForm((form) => ({ ...form, latitude: String(coords.latitude), longitude: String(coords.longitude), accuracy_limit_meters: String(Math.max(50, Math.ceil(coords.accuracy))) })),
      () => toast.error("Lokasi tidak dapat dibaca. Pastikan izin lokasi aktif."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const editSite = (site: any) => {
    setSiteForm({
      id: site.id,
      name: site.name || "",
      address: site.address || "",
      latitude: String(site.latitude ?? ""),
      longitude: String(site.longitude ?? ""),
      radius_meters: String(site.radius_meters ?? 150),
      accuracy_limit_meters: String(site.accuracy_limit_meters ?? 100),
      notes: site.notes || "",
      unitIds: (site.attendance_site_units ?? []).map((mapping: any) => mapping.unit_id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveSite = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const values = {
        name: siteForm.name.trim(),
        address: siteForm.address.trim() || null,
        latitude: Number(siteForm.latitude),
        longitude: Number(siteForm.longitude),
        radius_meters: Number(siteForm.radius_meters),
        accuracy_limit_meters: Number(siteForm.accuracy_limit_meters),
        notes: siteForm.notes.trim() || null,
        is_active: true,
      };
      const query = siteForm.id
        ? supabaseClient.from("attendance_sites").update(values).eq("id", siteForm.id).select("id").single()
        : supabaseClient.from("attendance_sites").insert(values).select("id").single();
      const { data, error } = await query;
      if (error) throw error;
      const siteId = (data as any).id as string;
      const { error: deleteError } = await supabaseClient.from("attendance_site_units").delete().eq("site_id", siteId);
      if (deleteError) throw deleteError;
      if (siteForm.unitIds.length) {
        const { error: mappingError } = await supabaseClient.from("attendance_site_units").insert(siteForm.unitIds.map((unitId) => ({ site_id: siteId, unit_id: unitId })));
        if (mappingError) throw mappingError;
      }
      toast.success(siteForm.id ? "Lokasi absensi diperbarui." : "Lokasi absensi ditambahkan.");
      setSiteForm(EMPTY_SITE);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Lokasi absensi gagal disimpan.");
    } finally { setIsSaving(false); }
  };

  const toggleSite = async (site: any) => {
    const { error } = await supabaseClient.from("attendance_sites").update({ is_active: !site.is_active }).eq("id", site.id);
    if (error) return toast.error(error.message);
    toast.success(site.is_active ? "Lokasi dinonaktifkan." : "Lokasi diaktifkan.");
    await loadData();
  };

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (policyForm.default_start_time === policyForm.default_end_time) return toast.error("Jam mulai dan selesai kerja tidak boleh sama.");
    if (policyForm.check_in_open === policyForm.check_in_close) return toast.error("Jam buka dan tutup absensi tidak boleh sama.");
    if (policyForm.require_geofence) {
      const hasSite = sites.some((site) => site.is_active && ((site.attendance_site_units ?? []).length === 0 || (site.attendance_site_units ?? []).some((mapping: any) => mapping.unit_id === policyForm.unit_id)));
      if (!hasSite) return toast.error("Tambahkan lokasi aktif untuk unit ini sebelum mewajibkan geofence.");
    }
    setIsSaving(true);
    try {
      const payload = {
        unit_id: policyForm.unit_id || null,
        name: policyForm.name,
        require_geofence: policyForm.require_geofence,
        allow_correction_request: policyForm.allow_correction_request,
        check_in_open: policyForm.check_in_open,
        check_in_close: policyForm.check_in_close,
        default_start_time: policyForm.default_start_time,
        default_end_time: policyForm.default_end_time,
        grace_minutes: Number(policyForm.grace_minutes),
        early_departure_tolerance_minutes: Number(policyForm.early_departure_tolerance_minutes),
        max_accuracy_meters: Number(policyForm.max_accuracy_meters),
        is_active: true,
      };
      const query = policyForm.id
        ? supabaseClient.from("attendance_policies").update(payload).eq("id", policyForm.id)
        : supabaseClient.from("attendance_policies").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success("Kebijakan absensi disimpan.");
      await loadData();
    } catch (error: any) { toast.error(error?.message || "Kebijakan gagal disimpan."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Absensi Pegawai"
        description="Kelola lokasi, radius, toleransi waktu, dan kebijakan lintas unit untuk pengajar serta staf."
        action={<div className="flex gap-2"><Link to="/attendance/reviews" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Tinjauan Koreksi</Link><Link to="/attendance/employees" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Presensi</Link></div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Lokasi aktif", value: enabledSiteCount, detail: `${sites.length} total`, icon: MapPin }, { label: "Aturan unit", value: configuredUnitCount, detail: `${units.length} unit sekolah`, icon: Settings2 }, { label: "Unit dengan geofence", value: geofenceUnitCount, detail: `${policies.length} kebijakan`, icon: ShieldCheck }, { label: "Unit terpetakan", value: mappedUnitCount, detail: "lokasi khusus", icon: Crosshair }].map(({ label, value, detail, icon: Icon }) => <div key={label} className="rounded-lg border bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-md bg-emerald-50 p-2 text-emerald-700"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div></div>)}
      </div>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-bold">Cakupan jam kerja per unit</h2>
          <p className="mt-1 text-xs text-muted-foreground">Urutan acuan: shift khusus, jadwal mengajar khusus part-time, kebijakan unit induk, lalu kebijakan lintas unit. Jadwal pelajaran tidak memengaruhi guru reguler.</p>
        </div>
        {policyCoverage.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Belum ada unit sekolah.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Unit</th><th className="px-5 py-3">Acuan</th><th className="px-5 py-3">Jam kerja</th><th className="px-5 py-3">Batas absen masuk</th><th className="px-5 py-3">Toleransi</th></tr></thead>
              <tbody className="divide-y">{policyCoverage.map(({ unit, explicitPolicy, effectivePolicy }) => <tr key={unit.id}><td className="px-5 py-3 font-semibold">{unit.name}</td><td className="px-5 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${explicitPolicy ? "bg-emerald-50 text-emerald-700" : effectivePolicy ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{explicitPolicy ? "Kebijakan unit" : effectivePolicy ? "Mengikuti lintas unit" : "Default sistem"}</span></td><td className="px-5 py-3 font-semibold">{String(effectivePolicy?.default_start_time || "07:00").slice(0, 5)} - {String(effectivePolicy?.default_end_time || "15:00").slice(0, 5)}</td><td className="px-5 py-3">{String(effectivePolicy?.check_in_open || "05:00").slice(0, 5)} - {String(effectivePolicy?.check_in_close || "10:00").slice(0, 5)}</td><td className="px-5 py-3">{effectivePolicy?.grace_minutes ?? 10} menit</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={saveSite} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">{siteForm.id ? "Ubah lokasi absensi" : "Tambah lokasi absensi"}</h2><p className="text-xs text-muted-foreground">Koordinat titik pusat dan radius area yang diperbolehkan.</p></div>{siteForm.id && <button type="button" onClick={() => setSiteForm(EMPTY_SITE)} className="text-sm font-semibold text-muted-foreground">Batal ubah</button>}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">Nama lokasi<input required value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="Kampus Utama" className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Alamat<input value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} placeholder="Alamat ringkas" className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Latitude<input required type="number" step="any" min="-90" max="90" value={siteForm.latitude} onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Longitude<input required type="number" step="any" min="-180" max="180" value={siteForm.longitude} onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Radius (meter)<input required type="number" min="25" max="2000" value={siteForm.radius_meters} onChange={(e) => setSiteForm({ ...siteForm, radius_meters: e.target.value })} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Batas akurasi GPS<input required type="number" min="10" max="1000" value={siteForm.accuracy_limit_meters} onChange={(e) => setSiteForm({ ...siteForm, accuracy_limit_meters: e.target.value })} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
          </div>
          <button type="button" onClick={useCurrentLocation} className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"><Crosshair className="h-4 w-4" /> Gunakan Posisi Saat Ini</button>
          <fieldset className="mt-5"><legend className="text-sm font-semibold">Berlaku untuk unit</legend><p className="mb-2 text-xs text-muted-foreground">Kosongkan semua untuk lokasi lintas unit.</p><div className="grid gap-2 sm:grid-cols-2">{units.map((unit) => <label key={unit.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><input type="checkbox" checked={siteForm.unitIds.includes(unit.id)} onChange={(e) => setSiteForm({ ...siteForm, unitIds: e.target.checked ? [...siteForm.unitIds, unit.id] : siteForm.unitIds.filter((id) => id !== unit.id) })} /> {unit.name}</label>)}</div></fieldset>
          <label className="mt-4 block text-sm font-semibold">Catatan<textarea value={siteForm.notes} onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })} rows={2} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label>
          <div className="mt-5 flex justify-end"><button disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : siteForm.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {siteForm.id ? "Simpan Perubahan" : "Tambah Lokasi"}</button></div>
        </form>

        <form onSubmit={savePolicy} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-bold">Kebijakan per unit</h2><p className="mb-4 text-xs text-muted-foreground">Atur jam kerja unit induk. Shift khusus pegawai dapat mengganti aturan ini; jadwal mengajar tidak.</p>
          <label className="text-sm font-semibold">Unit<select value={policyUnitId} onChange={(e) => setPolicyUnitId(e.target.value)} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="__global__">Lintas unit / default</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <div className="mt-4 space-y-3">
            <label className="flex items-start justify-between gap-3 rounded-md border p-3"><span><span className="block text-sm font-semibold">Wajib berada di lokasi</span><span className="block text-xs text-muted-foreground">Aktifkan setelah lokasi unit siap.</span></span><input type="checkbox" checked={policyForm.require_geofence} onChange={(e) => setPolicyForm({ ...policyForm, require_geofence: e.target.checked })} className="mt-1" /></label>
            <label className="flex items-start justify-between gap-3 rounded-md border p-3"><span><span className="block text-sm font-semibold">Izinkan pengajuan koreksi</span><span className="block text-xs text-muted-foreground">Untuk dinas luar, lupa absen, atau GPS gagal.</span></span><input type="checkbox" checked={policyForm.allow_correction_request} onChange={(e) => setPolicyForm({ ...policyForm, allow_correction_request: e.target.checked })} className="mt-1" /></label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Buka masuk<input required type="time" value={policyForm.check_in_open} onChange={(e) => setPolicyForm({ ...policyForm, check_in_open: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Tutup masuk<input required type="time" value={policyForm.check_in_close} onChange={(e) => setPolicyForm({ ...policyForm, check_in_close: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Jam mulai kerja<input required type="time" value={policyForm.default_start_time} onChange={(e) => setPolicyForm({ ...policyForm, default_start_time: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Jam selesai kerja<input required type="time" value={policyForm.default_end_time} onChange={(e) => setPolicyForm({ ...policyForm, default_end_time: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Toleransi terlambat<input type="number" min="0" max="180" value={policyForm.grace_minutes} onChange={(e) => setPolicyForm({ ...policyForm, grace_minutes: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Toleransi pulang awal<input type="number" min="0" max="180" value={policyForm.early_departure_tolerance_minutes} onChange={(e) => setPolicyForm({ ...policyForm, early_departure_tolerance_minutes: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label><label className="text-xs font-semibold">Akurasi maksimum<input type="number" min="10" max="1000" value={policyForm.max_accuracy_meters} onChange={(e) => setPolicyForm({ ...policyForm, max_accuracy_meters: e.target.value })} className="mt-1 w-full rounded-md border px-2 py-2 font-normal" /></label></div>
          <button disabled={isSaving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" /> Simpan Kebijakan</button>
        </form>
      </div>

      <AttendanceShiftSettings />

      <section className="rounded-lg border bg-card shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Daftar lokasi</h2><p className="text-xs text-muted-foreground">Lokasi tanpa pemetaan unit berlaku sebagai lokasi lintas unit.</p></div>{isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Memuat lokasi...</div> : sites.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Belum ada lokasi absensi.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Lokasi</th><th className="px-5 py-3">Unit</th><th className="px-5 py-3">Radius</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{sites.map((site) => <tr key={site.id}><td className="px-5 py-3"><p className="font-semibold">{site.name}</p><p className="text-xs text-muted-foreground">{site.address || `${site.latitude}, ${site.longitude}`}</p></td><td className="px-5 py-3">{(site.attendance_site_units ?? []).length ? (site.attendance_site_units ?? []).map((mapping: any) => mapping.units?.name).join(", ") : "Lintas unit"}</td><td className="px-5 py-3">{site.radius_meters} m <span className="text-xs text-muted-foreground">(akurasi {site.accuracy_limit_meters} m)</span></td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${site.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{site.is_active ? "Aktif" : "Nonaktif"}</span></td><td className="px-5 py-3"><div className="flex justify-end gap-2"><button onClick={() => editSite(site)} className="rounded-md border p-2" title="Ubah lokasi"><Pencil className="h-4 w-4" /></button><button onClick={() => void toggleSite(site)} className="rounded-md border px-3 py-2 text-xs font-semibold">{site.is_active ? "Nonaktifkan" : "Aktifkan"}</button></div></td></tr>)}</tbody></table></div>}</section>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4" /> Urutan aktivasi yang aman</h3><p className="mt-1 text-xs text-emerald-800">Tambahkan lokasi dan petakan unit, uji koordinat di lapangan, atur toleransi, lalu aktifkan geofence per unit. Kebijakan awal sengaja tidak memblokir absensi sampai lokasi siap.</p></div>
    </div>
  );
};
