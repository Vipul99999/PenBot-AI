import { Route, Routes, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardPage } from './DashboardPage';
import { UploadPage } from './UploadPage';
import { EditorPage } from './EditorPage';
import { SearchPage } from './SearchPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

function Home() {
  return (
    <div className="p-12 space-y-3">
      <h1 className="text-4xl font-bold">PenBot AI</h1>
      <p>Write by hand. Use digitally.</p>
      <div className="space-x-4">
        <Link to="/features" className="underline">Features</Link>
        <Link to="/pricing" className="underline">Pricing</Link>
        <Link to="/login" className="underline">Get Started</Link>
      </div>
    </div>
  );
}

function Features() {
  return <div className="p-12"><h2 className="text-3xl font-bold mb-3">Features</h2><p>OCR, smart structuring, formulas, code blocks, tables, summaries, flashcards, exports, and search.</p></div>;
}

function Pricing() {
  return <div className="p-12"><h2 className="text-3xl font-bold mb-3">Pricing</h2><p>Student free tier + Pro tier placeholder for future SaaS billing integration.</p></div>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/dashboard/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
        <Route path="/dashboard/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
