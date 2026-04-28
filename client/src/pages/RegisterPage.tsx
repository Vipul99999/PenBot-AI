import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await authApi.register({ name, email, password });
    nav('/login');
  };

  return <form onSubmit={submit} className="max-w-md mx-auto mt-20 glass p-6 space-y-3"><h2 className="text-xl">Register</h2><input className="w-full p-2 text-black" placeholder="Name" onChange={(e)=>setName(e.target.value)} /><input className="w-full p-2 text-black" placeholder="Email" onChange={(e)=>setEmail(e.target.value)} /><input className="w-full p-2 text-black" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} /><button className="bg-brand px-4 py-2 rounded">Register</button><Link to="/login">Back to login</Link></form>;
}
