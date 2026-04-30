import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authApi } from '@/api/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.token, data.user);
      nav('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
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
          <h1 className="text-xl font-black text-ink">Your handwritten notebook, ready to use.</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-ink/75">Review OCR, edit notes, search, and export study material.</p>
        </div>
        <div className="surface hidden max-w-md space-y-5 border-brand/20 p-6 lg:block">
          <h1 className="text-4xl font-black leading-tight text-ink">Your handwritten notebook, ready to use.</h1>
          <p className="text-lg font-medium leading-8 text-ink">Open your workspace to review OCR, edit notes, search, and export study material.</p>
          <div className="surface p-5">
            <p className="text-sm font-bold uppercase text-brand">Today&apos;s workflow</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-ink/80">
              <p>1. Upload handwritten notes</p>
              <p>2. Review OCR confidence</p>
              <p>3. Export clean study files</p>
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-4 pb-10 pt-3 sm:py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6 lg:border-0 lg:shadow-none">
          <div>
            <h2 className="text-3xl font-black text-ink">Welcome back</h2>
            <p className="mt-2 font-medium text-ink/75">Sign in to continue.</p>
          </div>
          {error && <div className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div>}
          <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} className="primary-button w-full">
            {loading ? 'Logging in...' : 'Login'}
            {!loading && <ArrowRight size={18} />}
          </button>
          <p className="text-sm font-medium text-ink/75">New here? <Link className="font-bold text-brand" to="/register">Create account</Link></p>
        </form>
      </section>
    </main>
  );
}
