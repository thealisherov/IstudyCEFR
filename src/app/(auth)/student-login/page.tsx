'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent, checkStudentAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { BookOpen, User, KeyRound } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Image from 'next/image';

export default function StudentLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checkStudentAuth()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = loginStudent(username, password);
      setLoading(false);
      if (success) {
        toast.success('Tizimga muvaffaqiyatli kirdingiz!');
        router.push('/dashboard');
      } else {
        toast.error('Login yoki parol noto\'g\'ri!');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 p-4 font-sans transition-colors">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden transition-colors">
        
        {/* Decorative ambient background glows */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-blue-500/30 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/30 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="text-center mb-8 relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tight text-slate-900 dark:text-white mb-6">
            <Image src="/istudylogo1.png" alt="iSTUDY Logo" width={36} height={36} className="rounded-lg object-contain" />
            iSTUDY<span className="text-indigo-600 dark:text-indigo-400">Mock</span>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Talaba Kirish</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Imtihonni boshlash uchun tizimga kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Login</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Loginingizni kiriting"
                    className="w-full pl-11 pr-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-slate-900 dark:text-indigo-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-indigo-900/50"
                  />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Parol</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolingizni kiriting"
                    className="w-full pl-11 pr-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-slate-900 dark:text-indigo-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-indigo-900/50"
                  />
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading ? 'Kirilmoqda...' : 'Tizimga Kirish'}
            </button>
          </form>
      </div>
    </div>
  );
}
