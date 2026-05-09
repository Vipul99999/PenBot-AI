import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { authApi } from '@/api/auth';
import { BrandLogo } from '@/components/BrandLogo';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const checks = useMemo(
    () => [
      { label: '8+ characters', ok: password.length >= 8 },
      { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
      { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
      { label: 'Number', ok: /[0-9]/.test(password) }
    ],
    [password]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.resetPassword({ token: token.trim(), password });
      setMessage(data.message || 'Password reset successful.');
      window.setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col gap-6 bg-mist p-4 sm:p-6 lg:p-10">
        <Link to="/">
          <BrandLogo />
        </Link>
        <div className="surface max-w-md space-y-4 border-brand/20 p-6">
          <h1 className="text-3xl font-black leading-tight text-ink">Set a new password.</h1>
          <p className="font-semibold leading-7 text-ink/75">Use a strong password to protect your note library and exported documents.</p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6 lg:border-0 lg:shadow-none">
          <div>
            <h2 className="text-3xl font-black text-ink">Reset password</h2>
            <p className="mt-2 font-medium text-ink/75">Enter your reset token and new password.</p>
          </div>
          {error && <div className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div>}
          {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div>}
          <input className="field" placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
          <input className="field" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <div className="grid gap-2 rounded-lg border border-ink/10 bg-mist/60 p-3">
            {checks.map((item) => (
              <p key={item.label} className={`flex items-center gap-2 text-sm font-bold ${item.ok ? 'text-emerald-700' : 'text-ink/65'}`}>
                <CheckCircle2 size={15} />
                {item.label}
              </p>
            ))}
          </div>
          <button disabled={loading || !token.trim() || !checks.every((item) => item.ok)} className="primary-button w-full">
            {loading ? 'Saving...' : 'Set new password'}
            {!loading && <KeyRound size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
