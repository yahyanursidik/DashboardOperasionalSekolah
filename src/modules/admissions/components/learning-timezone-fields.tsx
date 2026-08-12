import React, { useMemo } from "react";
import { Globe2 } from "lucide-react";
import {
  detectBrowserTimeZone,
  getInternationalTimeZoneOptions,
  indonesiaTimeZones,
  SCHOOL_TIME_ZONE,
  timeZoneLabel,
} from "../../../lib/timezones";

type LearningTimezoneFieldsProps = {
  country: string;
  timeZone: string;
  disabled?: boolean;
  idPrefix: string;
  onCountryChange: (value: string) => void;
  onTimeZoneChange: (value: string) => void;
};

export const LearningTimezoneFields: React.FC<LearningTimezoneFieldsProps> = ({
  country,
  timeZone,
  disabled,
  idPrefix,
  onCountryChange,
  onTimeZoneChange,
}) => {
  const isIndonesia = country.trim().toLowerCase() === "indonesia";
  const internationalOptions = useMemo(() => getInternationalTimeZoneOptions(timeZone), [timeZone]);

  const changeResidence = (value: "indonesia" | "international") => {
    if (value === "indonesia") {
      onCountryChange("Indonesia");
      if (!indonesiaTimeZones.some((item) => item.value === timeZone)) onTimeZoneChange(SCHOOL_TIME_ZONE);
      return;
    }
    onCountryChange("");
    const detected = detectBrowserTimeZone();
    onTimeZoneChange(indonesiaTimeZones.some((item) => item.value === detected) ? "UTC" : detected);
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
      <div className="flex gap-3">
        <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <div>
          <p className="font-bold text-blue-950">Domisili dan zona waktu pembelajaran</p>
          <p className="mt-1 text-sm leading-5 text-blue-900">Jadwal sekolah menggunakan WIB dan otomatis dikonversi ke waktu lokal siswa di portal orang tua.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${idPrefix}-residence-type`} className="text-sm font-semibold text-slate-800">
          Lokasi domisili *
          <select
            id={`${idPrefix}-residence-type`}
            value={isIndonesia ? "indonesia" : "international"}
            onChange={(event) => changeResidence(event.target.value as "indonesia" | "international")}
            disabled={disabled}
            className="mt-2 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          >
            <option value="indonesia">Indonesia</option>
            <option value="international">Luar negeri</option>
          </select>
        </label>

        {!isIndonesia && (
          <label htmlFor={`${idPrefix}-country`} className="text-sm font-semibold text-slate-800">
            Negara domisili *
            <input
              id={`${idPrefix}-country`}
              value={country}
              onChange={(event) => onCountryChange(event.target.value)}
              disabled={disabled}
              placeholder="Contoh: Malaysia, Jepang, Qatar"
              autoComplete="country-name"
              className="mt-2 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </label>
        )}

        <label htmlFor={`${idPrefix}-timezone`} className={`text-sm font-semibold text-slate-800 ${isIndonesia ? "" : "sm:col-span-2"}`}>
          Zona waktu siswa *
          <select
            id={`${idPrefix}-timezone`}
            value={timeZone}
            onChange={(event) => onTimeZoneChange(event.target.value)}
            disabled={disabled}
            className="mt-2 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          >
            <option value="">Pilih zona waktu</option>
            {(isIndonesia ? indonesiaTimeZones : internationalOptions).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {timeZone && <span className="mt-2 block text-xs font-normal text-slate-600">Waktu aktif: {timeZoneLabel(timeZone)}</span>}
        </label>
      </div>
    </div>
  );
};
