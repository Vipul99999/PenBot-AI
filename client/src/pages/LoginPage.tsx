import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await authApi.login({ email, password });
    setAuth(data.token, data.user);
    nav('/dashboard');
  };

  return <form onSubmit={submit} className="max-w-md mx-auto mt-20 glass p-6 space-y-3"><h2 className="text-xl">Login</h2><input className="w-full p-2 text-black" placeholder="Email" onChange={(e)=>setEmail(e.target.value)} /><input className="w-full p-2 text-black" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} /><button className="bg-brand px-4 py-2 rounded">Login</button><Link to="/register">Create account</Link></form>;
}
