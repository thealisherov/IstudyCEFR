'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTests } from '@/lib/db';
import { Test, SectionType } from '@/types/test';
import { useTestStore } from '@/lib/store';
import { toast } from 'sonner';
import { BookOpen, LogOut, Clock, Layers, User, Award, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function StudentDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    setTests(getTests().filter(t => t.isPublished));
  }, []);

  const handleOpenStartModal = (test: Test) => {
    setSelectedTest(test);
    setFirstName('');
    setLastName('');
  };

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Ism va Familiyangizni kiriting!');
      return;
    }

    const store = useTestStore.getState();
    store.setName(firstName.trim(), lastName.trim());
    
    const testMode = selectedTest.testType === 'practice' ? 'practice' : 'full';
    const testSection = selectedTest.practiceSection || 'listening';
    
    store.startTest(selectedTest, testMode, testSection, 0);

    toast.success('Test boshlandi. Omad tilaymiz!');
    router.push(`/test/${selectedTest.id}`);
  };



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 py-4 px-6 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">CEFR Mock Exam</h1>
              <p className="text-slate-400 text-xs">Student Testing Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-slate-300 hover:text-white text-sm font-semibold transition bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <span className="bg-blue-500/30 text-blue-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">CEFR Tizimi</span>
            <h2 className="text-3xl font-extrabold mt-3 mb-4 leading-tight">O'z bilim darajangizni CEFR tizimida tekshirib ko'ring</h2>
            <p className="text-blue-100 text-base leading-relaxed">
              Bu yerda siz Listening (Tinglab tushunish), Reading (O'qish) va Writing (Yozma nutq) bo'yicha imtihonlarni topshirishingiz va to'liq natijalarga ega bo'lishingiz mumkin. Natijangiz rasmiy CEFR baholash tizimi asosida hisoblab beriladi.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Mavjud Mock Imtihonlari ({tests.length})
        </h3>

        {tests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Hozirda faol mock testlar mavjud emas.</p>
            <p className="text-slate-400 text-sm mt-1">Admin tomonidan yangi testlar yaratilishini kuting.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div 
                key={test.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md dark:hover:shadow-indigo-900/20 transition flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{test.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Listening, Reading va Writing bloklarini qamrab olgan to'liq imtihon majmuasi.
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                      <Award className="w-4 h-4 text-indigo-500" />
                      <span>Turi: {test.testType === 'practice' ? 'Practice (Muayyan bo\'lim)' : 'To\'liq Imtihon'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>Umumiy vaqt: {test.listeningTime + test.readingTime + test.writingTime} daqiqa</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenStartModal(test)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  Testni Boshlash
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Name Input / Mode Selection Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{selectedTest.title}</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">
              Imtihonni boshlash uchun ma'lumotlaringizni to'ldiring va rejimni tanlang.
            </p>

            <form onSubmit={handleStartTest} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Ismingiz</label>
                  <input
                    type="text"
                    required
                    placeholder="Ali"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Familiyangiz</label>
                  <input
                    type="text"
                    required
                    placeholder="Karimov"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>
              </div>



              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTest(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition text-sm text-center"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition text-sm shadow-md"
                >
                  Boshlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
