import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { authApi } from '@/api/auth';
import { BrandLogo } from '@/components/BrandLogo';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDevToken('');
    try {
      const { data } = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setMessage(data.message || 'If this email exists, a reset link has been generated.');
      if (data.resetToken) setDevToken(data.resetToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start password reset.');
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
          <h1 className="text-3xl font-black leading-tight text-ink">Recover your workspace.</h1>
          <p className="font-semibold leading-7 text-ink/75">Enter your email and PenBot will generate a secure reset flow for your account.</p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6 lg:border-0 lg:shadow-none">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <ArrowLeft size={16} />
            Back to login
          </Link>
          <div>
            <h2 className="text-3xl font-black text-ink">Forgot password</h2>
            <p className="mt-2 font-medium text-ink/75">We will never reveal whether an email exists.</p>
          </div>
          {error && <div className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-medium text-coral">{error}</div>}
          {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div>}
          {devToken && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-ink">
              <p className="font-black text-amber-800">Development reset token</p>
              <p className="mt-2 break-all">{devToken}</p>
              <Link className="mt-3 inline-block font-black text-brand" to={`/reset-password?token=${encodeURIComponent(devToken)}`}>Continue reset</Link>
            </div>
          )}
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <button disabled={loading || !email.trim()} className="primary-button w-full">
            {loading ? 'Sending...' : 'Send reset link'}
            {!loading && <Send size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
