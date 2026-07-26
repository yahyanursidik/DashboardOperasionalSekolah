import React from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export type PortalAccent = "emerald" | "blue" | "amber" | "violet" | "rose" | "cyan";

const accents: Record<PortalAccent, {
  panel: string;
  overlay: string;
  soft: string;
  text: string;
  button: string;
  focus: string;
}> = {
  emerald: {
    panel: "bg-emerald-800",
    overlay: "bg-emerald-950/75",
    soft: "bg-emerald-50 text-emerald-800",
    text: "text-emerald-800",
    button: "bg-emerald-700 hover:bg-emerald-800",
    focus: "focus:border-emerald-600 focus:ring-emerald-100",
  },
  blue: {
    panel: "bg-blue-800",
    overlay: "bg-blue-950/75",
    soft: "bg-blue-50 text-blue-800",
    text: "text-blue-800",
    button: "bg-blue-700 hover:bg-blue-800",
    focus: "focus:border-blue-600 focus:ring-blue-100",
  },
  amber: {
    panel: "bg-amber-700",
    overlay: "bg-amber-950/70",
    soft: "bg-amber-50 text-amber-800",
    text: "text-amber-800",
    button: "bg-amber-700 hover:bg-amber-800",
    focus: "focus:border-amber-600 focus:ring-amber-100",
  },
  violet: {
    panel: "bg-violet-800",
    overlay: "bg-violet-950/75",
    soft: "bg-violet-50 text-violet-800",
    text: "text-violet-800",
    button: "bg-violet-700 hover:bg-violet-800",
    focus: "focus:border-violet-600 focus:ring-violet-100",
  },
  rose: {
    panel: "bg-rose-800",
    overlay: "bg-rose-950/75",
    soft: "bg-rose-50 text-rose-800",
    text: "text-rose-800",
    button: "bg-rose-700 hover:bg-rose-800",
    focus: "focus:border-rose-600 focus:ring-rose-100",
  },
  cyan: {
    panel: "bg-cyan-800",
    overlay: "bg-cyan-950/75",
    soft: "bg-cyan-50 text-cyan-800",
    text: "text-cyan-800",
    button: "bg-cyan-700 hover:bg-cyan-800",
    focus: "focus:border-cyan-600 focus:ring-cyan-100",
  },
};

export function PortalLoginShell({
  portalName,
  title = "Masuk ke akun Anda",
  description,
  icon: Icon,
  accent = "emerald",
  children,
  footer,
  sideNote = "Akses aman untuk pengguna yang telah terdaftar dan memiliki kewenangan aktif.",
}: {
  portalName: string;
  title?: string;
  description: string;
  icon: LucideIcon;
  accent?: PortalAccent;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sideNote?: string;
}) {
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();
  const tone = accents[accent];
  const coverUrl = loginCoverUrl || "/images/portal-login-school.png";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 p-3 text-slate-950 sm:p-6 lg:grid lg:place-items-center">
      <div
        aria-hidden="true"
        className="portal-login-scene absolute inset-0 bg-cover bg-center opacity-[0.12] lg:hidden"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-slate-100/90 lg:hidden" />

      <div className="portal-login-card relative mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:min-h-0 lg:grid-cols-[0.92fr_1.08fr]">
        <section
          className={`relative hidden min-h-[650px] overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between ${tone.panel}`}
        >
          <div
            aria-hidden="true"
            className="portal-login-scene absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
          <div aria-hidden="true" className={`absolute inset-0 ${tone.overlay}`} />
          <div className="relative">
            <BrandMark logoUrl={logoUrl} appName={appName} icon={Icon} />
            <p className="mt-12 text-xs font-bold uppercase text-white/70">Ruang akses resmi</p>
            <h1 className="mt-2 text-4xl font-bold">{portalName}</h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/80">{sideNote}</p>
          </div>
          <div className="relative border-t border-white/20 pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Sesi terenkripsi dan terlindungi</p>
            <p className="mt-2 text-xs text-white/65">{appName || "Sistem Informasi Sekolah"}</p>
          </div>
        </section>

        <section className="relative flex min-w-0 flex-col justify-start overflow-hidden px-5 py-7 sm:px-10 sm:py-10 lg:justify-center lg:px-14">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 overflow-hidden lg:hidden">
            <div
              className="portal-login-scene absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
            <div className={`absolute inset-0 ${tone.overlay}`} />
          </div>

          <div className="relative z-10 mb-10 flex h-14 items-center gap-3 text-white lg:hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={appName || "Logo sekolah"} className="h-12 w-12 rounded-md border bg-white object-contain p-1.5" />
            ) : (
              <span className={`flex h-12 w-12 items-center justify-center rounded-md ${tone.soft}`}><Icon className="h-6 w-6" /></span>
            )}
            <div className="min-w-0">
              <p className="truncate font-bold">{portalName}</p>
              <p className="truncate text-xs text-white/75">{appName || "Sistem Informasi Sekolah"}</p>
            </div>
          </div>

          <div className={`mb-5 hidden h-11 w-11 items-center justify-center rounded-md lg:flex ${tone.soft}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>

          <div className="mt-8">{children}</div>

          <footer className="mt-7 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500 lg:text-left">
            {footer && <div className="mb-4">{footer}</div>}
            <p>
              Disusun dan dikembangkan oleh{" "}
              <a
                href="https://yahyanursidik.my.id/"
                target="_blank"
                rel="noreferrer"
                className={`font-semibold underline decoration-slate-300 underline-offset-4 transition-opacity hover:opacity-75 ${tone.text}`}
              >
                Yahya Nursidik
              </a>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {appName || "Sistem Informasi Sekolah"} {new Date().getFullYear()}
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

function BrandMark({ logoUrl, appName, icon: Icon }: { logoUrl?: string | null; appName?: string | null; icon: LucideIcon }) {
  return logoUrl ? (
    <img src={logoUrl} alt={appName || "Logo sekolah"} className="portal-login-mark h-16 max-w-44 rounded-md bg-white p-2 object-contain" />
  ) : (
    <span className="portal-login-mark flex h-14 w-14 items-center justify-center rounded-md bg-white text-slate-900"><Icon className="h-7 w-7" /></span>
  );
}

export function PortalTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  accent = "emerald",
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  uppercase,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  accent?: PortalAccent;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  uppercase?: boolean;
  help?: string;
}) {
  const tone = accents[accent];
  return (
    <div className="block">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">{label}</label>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        <input
          id={id}
          type={type}
          required
          value={value}
          onChange={(event) => onChange(uppercase ? event.target.value.toUpperCase() : event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          className={`h-12 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 ${tone.focus} ${uppercase ? "font-mono text-base uppercase" : ""}`}
        />
      </span>
      {help && <span className="mt-2 block text-xs leading-5 text-slate-500">{help}</span>}
    </div>
  );
}

export function PortalPasswordField({
  id,
  value,
  onChange,
  accent = "emerald",
  label = "Kata Sandi",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  accent?: PortalAccent;
  label?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const tone = accents[accent];
  return (
    <div className="block">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">{label}</label>
      <span className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Masukkan kata sandi"
          autoComplete="current-password"
          className={`h-12 w-full rounded-md border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 ${tone.focus}`}
        />
        <button
          type="button"
          title={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </div>
  );
}

export function PortalLoginButton({
  loading,
  disabled,
  label = "Masuk ke Portal",
  loadingLabel = "Memeriksa akun...",
  accent = "emerald",
}: {
  loading: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  accent?: PortalAccent;
}) {
  const tone = accents[accent];
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${tone.button}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      {loading ? loadingLabel : label}
    </button>
  );
}

export function PortalLoginAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800">
      {children}
    </div>
  );
}
