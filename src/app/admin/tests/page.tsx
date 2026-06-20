'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTests, getTestsAsync, saveTest, deleteTest } from '@/lib/db';
import { Test } from '@/types/test';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Eye, EyeOff, FileQuestion, Calendar, Clock } from 'lucide-react';

export default function AdminTests() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTests = async () => {
    try {
      const freshTests = await getTestsAsync();
      setTests(freshTests);
    } catch (err: any) {
      toast.error('Testlarni serverdan yuklashda xatolik: ' + (err.message || ''));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Show cached data instantly
    const cached = getTests();
    if (cached.length > 0) {
      setTests(cached);
      setLoading(false);
    }
    // Fetch fresh from Supabase
    loadTests();
  }, []);

  const handleTogglePublish = async (test: Test) => {
    const updated: Test = { ...test, isPublished: !test.isPublished };
    await saveTest(updated);
    toast.success(updated.isPublished ? 'Test nashr qilindi!' : 'Test nashrdan olindi.');
    await loadTests();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Haqiqatan ham ushbu testni butunlay o\'chirib tashlamoqchimisiz?')) {
      await deleteTest(id);
      toast.success('Test o\'chirildi.');
      await loadTests();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm dark:shadow-md transition-colors">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Testlar Ro'yxati</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Siz yaratgan barcha testlar va ularning statuslari.</p>
        </div>
        <button
          onClick={() => router.push('/admin/tests/create')}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Yangi Test Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 transition-colors">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="font-semibold">Testlar yuklanmoqda...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 transition-colors">
          <FileQuestion className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="font-semibold">Hozircha hech qanday test yaratilmagan.</p>
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Yangi test yaratish tugmasini bosib birinchi testni qo'shing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div key={test.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col justify-between transition-colors">
              <div>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-2">{test.title}</h3>
                  <button
                    onClick={() => handleTogglePublish(test)}
                    className={`p-1.5 rounded-lg border transition ${
                      test.isPublished
                        ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                        : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={test.isPublished ? "Nashrdan olish" : "Nashr qilish"}
                  >
                    {test.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2.5 my-5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <span>L: {test.listeningTime}m | R: {test.readingTime}m | W: {test.writingTime}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileQuestion className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <span>Savollar: {test.listeningParts.reduce((a, p) => a + p.questions.length, 0) + test.readingParts.reduce((a, p) => a + p.questions.length, 0)} ta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <span>{new Date(test.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => router.push(`/admin/tests/${test.id}/edit`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                </button>
                <button
                  onClick={() => handleDelete(test.id)}
                  className="p-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl transition"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
