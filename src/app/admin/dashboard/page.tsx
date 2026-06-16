'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTests, getSubmissions } from '@/lib/db';
import { Test, Submission } from '@/types/test';
import StatCard from '@/components/admin/StatCard';
import { Users, FileText, CheckCircle2, TrendingUp, Plus, ArrowRight, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    setTests(getTests());
    setSubmissions(getSubmissions());
  }, []);

  const totalTests = tests.length;
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.isGraded).length;
  const avgListening = totalSubmissions > 0
    ? Math.round(submissions.reduce((a, s) => a + (s.listeningCEFR || 0), 0) / totalSubmissions) : 0;
  const avgReading = totalSubmissions > 0
    ? Math.round(submissions.reduce((a, s) => a + (s.readingCEFR || 0), 0) / totalSubmissions) : 0;
  const recentSubmissions = submissions.slice(-5).reverse();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 dark:from-slate-900 dark:to-indigo-950 border border-indigo-500/20 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Xush Kelibsiz, Admin!</h2>
          <p className="text-indigo-100 dark:text-slate-400 text-xs md:text-sm mt-1.5">Mock platformadagi testlar va natijalarni shu yerdan boshqaring.</p>
        </div>
        <button
          onClick={() => router.push('/admin/tests/create')}
          className="flex items-center gap-1.5 bg-white/20 dark:bg-indigo-600 hover:bg-white/30 dark:hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Yangi Test Yaratish
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={FileText} label="Umumiy Testlar" value={totalTests} color="blue" />
        <StatCard icon={Users} label="Topshirganlar" value={totalSubmissions} color="emerald" />
        <StatCard icon={CheckCircle2} label="Baholangan (Writing)" value={`${gradedSubmissions} / ${totalSubmissions}`} color="amber" />
        <StatCard icon={TrendingUp} label="O'rtacha L / R" value={`${avgListening} / ${avgReading}`} suffix="max 75" color="indigo" />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">Oxirgi Natijalar</h4>
          <button
            onClick={() => router.push('/admin/submissions')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition"
          >
            Barchasini ko'rish <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Hali hech qanday imtihon topshirilmagan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">O'quvchi</th>
                  <th className="px-6 py-4">Test Nomi</th>
                  <th className="px-6 py-4">Listening</th>
                  <th className="px-6 py-4">Reading</th>
                  <th className="px-6 py-4">Writing</th>
                  <th className="px-6 py-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{sub.lastName} {sub.firstName}</td>
                    <td className="px-6 py-4">{sub.testTitle}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-mono font-bold text-xs">
                        {sub.listeningCEFR}/75
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-xs">
                        {sub.readingCEFR}/75
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {sub.isGraded ? (
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-900/30">
                          Baholangan ({sub.writingScore})
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded text-xs font-bold border border-amber-200 dark:border-amber-900/30">
                          Kutilmoqda
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/admin/submissions?id=${sub.id}`)}
                        className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Tekshirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
