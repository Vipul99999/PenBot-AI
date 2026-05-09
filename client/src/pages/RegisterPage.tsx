import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();
  const passwordChecks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) }
  ];
  const canSubmit = name.trim().length >= 2 && email.trim().includes('@') && passwordChecks.every((item) => item.ok);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      setAuth(data.token, data.user);
      nav('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:bg-mist lg:p-10">
        <Link to="/">
          <BrandLogo />
        </Link>
        <div className="rounded-lg border border-brand/15 bg-mist p-4 lg:hidden">
          <h1 className="text-xl font-black text-ink">Build a clean digital library from class notes.</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-ink/75">Create your workspace and convert scans into editable notes.</p>
        </div>
        <div className="surface hidden max-w-md space-y-5 border-brand/20 p-6 lg:block">
          <h1 className="text-4xl font-black leading-tight text-ink">Build a clean digital library from class notes.</h1>
          <p className="text-lg font-medium leading-8 text-ink">Create your PenBot workspace and start converting scans into editable notes.</p>
          <div className="surface p-5">
            <p className="text-sm font-bold uppercase text-brand">What you get</p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-ink/80">
              <p>OCR review with confidence blocks</p>
              <p>Editable rich notes</p>
              <p>PDF, DOCX, Markdown, and TXT export</p>
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-4 pb-10 pt-3 sm:py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6 lg:border-0 lg:shadow-none">
          <div>
            <h2 className="text-3xl font-black text-ink">Create account</h2>
            <p className="mt-2 font-medium text-ink/75">Start with your first upload.</p>
          </div>
          {error && <div className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div>}
          <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <div className="grid gap-2 rounded-lg border border-ink/10 bg-mist/60 p-3">
            {passwordChecks.map((item) => (
              <p key={item.label} className={`flex items-center gap-2 text-sm font-bold ${item.ok ? 'text-emerald-700' : 'text-ink/65'}`}>
                <CheckCircle2 size={15} />
                {item.label}
              </p>
            ))}
          </div>
          <button disabled={loading || !canSubmit} className="primary-button w-full">
            {loading ? 'Creating...' : 'Create workspace'}
            {!loading && <ArrowRight size={18} />}
          </button>
          <p className="text-sm font-medium text-ink/75">Already registered? <Link className="font-bold text-brand" to="/login">Login</Link></p>
        </form>
      </section>
    </main>
  );
}
