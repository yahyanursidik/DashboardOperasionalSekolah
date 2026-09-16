import { Loader2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

type Province = { id: string; name: string };
type Regency = { id: string; name: string };
type RegionResponse<T> = { data?: T[] };
type DomicileSuggestion = { id: string; name: string; province: string };

const REGION_API = "https://www.emsifa.com/api-wilayah-indonesia/v2";
let suggestionsPromise: Promise<DomicileSuggestion[]> | null = null;

const simplify = (value: string) => value.toLocaleLowerCase("id-ID")
  .replace(/\b(kabupaten|kota|administrasi|adm\.?|kab\.?|kot\.?)\b/g, " ")
  .replace(/[^a-z0-9]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const getJson = async <T,>(path: string): Promise<T[]> => {
  const response = await fetch(`${REGION_API}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Referensi wilayah tidak tersedia.");
  const payload = await response.json() as RegionResponse<T>;
  return Array.isArray(payload.data) ? payload.data : [];
};

const getSuggestions = () => {
  if (!suggestionsPromise) {
    suggestionsPromise = (async () => {
      const provinces = await getJson<Province>("/provinces.json");
      const regencies = await Promise.allSettled(provinces.map(async (province) => {
        const rows = await getJson<Regency>(`/regencies/${province.id}.json`);
        return rows.map((row) => ({ id: row.id, name: row.name, province: province.name }));
      }));
      const values = regencies.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      if (!values.length) throw new Error("Referensi wilayah tidak tersedia.");
      return values;
    })();
  }
  return suggestionsPromise;
};

interface IndonesiaDomicileSuggestProps {
  cityRegency: string;
  province: string;
  disabled?: boolean;
  inputClassName: string;
  onCityRegencyChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
}

export const IndonesiaDomicileSuggest = ({ cityRegency, province, disabled, inputClassName, onCityRegencyChange, onProvinceChange }: IndonesiaDomicileSuggestProps) => {
  const [regions, setRegions] = useState<DomicileSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [referenceUnavailable, setReferenceUnavailable] = useState(false);
  const [open, setOpen] = useState(false);

  const loadRegions = async () => {
    if (regions.length || loading || referenceUnavailable) return;
    setLoading(true);
    try {
      setRegions(await getSuggestions());
    } catch {
      setReferenceUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  const matches = useMemo(() => {
    const query = simplify(cityRegency);
    if (query.length < 2) return [];
    return regions.filter((item) => simplify(item.name).includes(query)).slice(0, 8);
  }, [cityRegency, regions]);

  const select = (item: DomicileSuggestion) => {
    onCityRegencyChange(item.name);
    onProvinceChange(item.province);
    setOpen(false);
  };

  return <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
    <div className="relative">
      <label className="text-sm font-semibold">Kota / Kabupaten domisili *</label>
      <div className="relative mt-2">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputClassName} pl-10`}
          value={cityRegency}
          onFocus={() => { setOpen(true); void loadRegions(); }}
          onChange={(event) => { onCityRegencyChange(event.target.value); onProvinceChange(""); setOpen(true); void loadRegions(); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          placeholder="Ketik contoh: Bandung atau Tangerang"
          autoComplete="address-level2"
          disabled={disabled}
        />
        {loading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-700" />}
      </div>
      {open && cityRegency.trim().length >= 2 && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg">
        {matches.map((item) => <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)} className="block w-full px-3 py-2.5 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"><span className="block text-sm font-semibold text-slate-900">{item.name}</span><span className="block text-xs text-slate-500">{item.province}</span></button>)}
        {!loading && !matches.length && <p className="px-3 py-2.5 text-xs text-slate-600">{referenceUnavailable ? "Referensi wilayah sedang tidak tersedia. Isi kota/kabupaten dan pilih provinsi secara manual." : "Ketik minimal dua huruf atau lanjutkan isi secara manual."}</p>}
      </div>}
      <p className="mt-1.5 text-xs font-normal text-slate-500">Pilih salah satu saran agar provinsi terisi otomatis. Anda tetap dapat mengisi manual bila diperlukan.</p>
    </div>
    <label className="text-sm font-semibold">Provinsi *<input className={`${inputClassName} mt-2`} value={province} onChange={(event) => onProvinceChange(event.target.value)} placeholder="Terisi otomatis setelah memilih kota" autoComplete="address-level1" disabled={disabled} /><span className="mt-1.5 block text-xs font-normal text-slate-500">Dapat dikoreksi jika domisili berada di luar Indonesia atau referensi tidak tersedia.</span></label>
  </div>;
};
