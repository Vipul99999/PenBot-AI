import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Search, Sparkles, UploadCloud } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { DashboardPage } from './DashboardPage';
import { UploadPage } from './UploadPage';
import { EditorPage } from './EditorPage';
import { SearchPage } from './SearchPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

function Home() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <main className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <BrandLogo />
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/login" className="ghost-button">Login</Link>
          <Link to="/register" className="primary-button px-3 sm:px-4">Start</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-10 lg:px-8">
        <div className="space-y-7">
          <div className="badge bg-mist text-brand">
            <Sparkles size={14} />
            Handwriting to searchable study notes
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-ink sm:text-5xl lg:text-6xl">
              Turn handwritten pages into clean digital notes.
            </h1>
            <p className="max-w-2xl text-base font-medium leading-7 text-ink/75 sm:text-lg sm:leading-8">
              PenBot AI converts scans and PDFs into editable notes with confidence review, summaries, flashcards,
              search, and exports.
            </p>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/register" className="primary-button w-full sm:w-auto">
              Create workspace
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="secondary-button w-full sm:w-auto">Open existing</Link>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ['Upload', 'Images and PDFs'],
              ['Edit', 'Tiptap note editor'],
              ['Export', 'PDF, DOCX, MD, TXT']
            ].map(([title, copy]) => (
              <div key={title} className="soft-surface p-4">
                <p className="font-bold text-ink">{title}</p>
                <p className="mt-1 text-sm text-ink/60">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-ink/10 bg-white px-5 py-4">
            <p className="text-sm font-bold text-ink">Notebook Preview</p>
          </div>
          <div className="grid gap-0 md:grid-cols-[0.82fr_1fr]">
            <div className="bg-mist p-5">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-brand">Converted page</p>
                  <span className="badge bg-emerald-100 text-emerald-800">93% OCR</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-black text-ink">Computer Networks</p>
                    <p className="mt-1 text-sm leading-6 text-ink/75">
                      TCP provides reliable, ordered delivery of data between applications.
                    </p>
                  </div>
                  <div className="rounded-md border border-ink/10 bg-paper p-3">
                    <p className="text-xs font-bold uppercase text-ink/55">Recognized formula</p>
                    <p className="mt-1 font-mono text-lg text-ink">a^2 + b^2 = c^2</p>
                  </div>
                  <ul className="space-y-2 text-sm text-ink/75">
                    <li className="flex gap-2"><span className="text-brand">-</span> TCP handles retransmission.</li>
                    <li className="flex gap-2"><span className="text-brand">-</span> UDP is faster but connectionless.</li>
                    <li className="flex gap-2"><span className="text-brand">-</span> Routing moves packets across networks.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {[
                [FileText, 'Computer Networks', 'TCP provides reliable ordered delivery.'],
                [CheckCircle2, 'Confidence Review', 'Low-confidence OCR lines stay visible.'],
                [Search, 'Search Ready', 'Tags: CN, TCP, Protocols'],
                [UploadCloud, 'Exports', 'PDF and DOCX are one click away.']
              ].map(([Icon, title, copy]) => {
                const TypedIcon = Icon as typeof FileText;
                return (
                  <div key={String(title)} className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mist text-brand">
                      <TypedIcon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-ink">{String(title)}</p>
                      <p className="text-sm text-ink/60">{String(copy)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/dashboard/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
        <Route path="/dashboard/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
