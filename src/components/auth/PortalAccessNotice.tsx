type Props = { message: string; onRetry: () => void; onLogout: () => void };

export function PortalAccessNotice({ message, onRetry, onLogout }: Props) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <section role="alert" className="max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold text-slate-900">Portal belum dapat dibuka</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      <p className="mt-2 text-sm text-slate-600">Anda tidak dikeluarkan otomatis dari akun.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onRetry} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button>
        <button type="button" onClick={onLogout} className="rounded-md border px-4 py-2 text-sm font-semibold text-slate-700">Keluar / Ganti Akun</button>
      </div>
    </section>
  </div>;
}
