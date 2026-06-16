'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAdminAuth, logoutAdmin } from '@/lib/auth';
import { toast } from 'sonner';
import { LayoutDashboard, Library, FileText, Settings, LogOut, ShieldAlert, Home } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Testlar Boshqaruvi', path: '/admin/tests', icon: Library },
  { label: 'Natijalar', path: '/admin/submissions', icon: FileText },
  { label: 'Sozlamalar', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checkAdminAuth()) {
      toast.error('Admin paneli uchun tizimga kiring.');
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    logoutAdmin();
    toast.success('Admin tizimidan chiqildi.');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-colors">
        <div>
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wider uppercase">CEFR Admin</h2>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-widest">Control Panel</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-none">CEFR Administrator</p>
              <span className="text-[10px] text-slate-400">System Owner</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition"
          >
            <Home className="w-3.5 h-3.5" />
            Student Panelga O'tish
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Tizimdan Chiqish
          </button>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between shrink-0 transition-colors">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
            {navItems.find(item => pathname?.startsWith(item.path))?.label || 'Boshqaruv'}
          </h3>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-xs text-slate-400 font-semibold">
              {new Date().toLocaleDateString('uz-UZ')}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
