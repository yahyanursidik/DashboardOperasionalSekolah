import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import './index.css'
import App from './app/App.tsx'

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isDomMutationError = /insertBefore|removeChild|not a child/i.test(this.state.error?.message || '');
      return (
        <main className="notranslate flex min-h-screen items-center justify-center bg-slate-50 p-5" translate="no">
          <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-950">Halaman perlu dimuat ulang</h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {isDomMutationError
                    ? 'Struktur halaman berubah di luar aplikasi, biasanya karena penerjemah otomatis atau ekstensi browser.'
                    : 'Terjadi kendala saat menampilkan halaman. Data yang sudah tersimpan tetap aman.'}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Muat Ulang
                </button>
                {import.meta.env.DEV && this.state.error ? (
                  <details className="mt-5 text-xs text-slate-500">
                    <summary className="cursor-pointer font-semibold">Detail teknis</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-slate-100 p-3">{this.state.error.stack || this.state.error.message}</pre>
                  </details>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
