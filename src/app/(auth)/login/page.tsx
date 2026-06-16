'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, checkAdminAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, BookOpen, KeyRound, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checkAdminAuth()) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = loginAdmin(adminPassword);
      setLoading(false);
      if (success) {
        toast.success('Admin paneliga xush kelibsiz!');
        router.push('/admin/dashboard');
      } else {
        toast.error('Admin paroli noto\'g\'ri!');
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
        
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Admin Panel</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Platformani boshqarish uchun tizimga kiring</p>
        </div>

        <form onSubmit={handleAdminSubmit} className="space-y-5 relative z-10">
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Admin Paroli</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Maxfiy parolni kiriting"
                    className="w-full pl-11 pr-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-slate-900 dark:text-indigo-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-indigo-900/50"
                  />
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Kirilmoqda...' : 'Admin Kirish'}
            </button>

            <div className="mt-4 text-center">
              <span className="text-slate-500 text-xs">
                Standart admin paroli: <code className="text-slate-300">admincefr2026</code>
              </span>
            </div>
          </form>
      </div>
    </div>
  );
}
