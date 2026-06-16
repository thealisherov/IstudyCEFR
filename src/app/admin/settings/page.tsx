'use client';

import React, { useState, useEffect } from 'react';
import { getSharedSettings, saveSharedSettings } from '@/lib/db';
import { toast } from 'sonner';
import { Settings, Save, User, KeyRound, Info } from 'lucide-react';

export default function AdminSettings() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const settings = getSharedSettings();
    setUsername(settings.sharedUsername);
    setPassword(settings.sharedPasswordHash);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Barcha maydonlarni to\'ldiring!');
      return;
    }
    await saveSharedSettings({ sharedUsername: username.trim(), sharedPasswordHash: password.trim() });
    toast.success('Sozlamalar muvaffaqiyatli yangilandi!');
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl transition-colors">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          O'quvchi Kirish Sozlamalari
        </h2>

        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-4 flex gap-3 text-indigo-700 dark:text-indigo-300 text-xs mb-6">
          <Info className="w-5 h-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
          <p className="leading-relaxed">
            Bu yerda belgilangan login va parol <strong>barcha o'quvchilar</strong> uchun umumiy hisoblanadi.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Login (Username)</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500"><User className="w-4 h-4" /></span>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Parol (Password)</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500"><KeyRound className="w-4 h-4" /></span>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold" />
            </div>
          </div>

          <button type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
            <Save className="w-4 h-4" /> Sozlamalarni Saqlash
          </button>
        </form>
      </div>
    </div>
  );
}
