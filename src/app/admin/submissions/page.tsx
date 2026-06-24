'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSubmissions, getSubmissionsAsync, saveSubmission, getTestById, getTestByIdAsync } from '@/lib/db';
import { Submission, Test, TestPart } from '@/types/test';
import { normalizeAnswer } from '@/lib/scoring';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Star, Copy, CheckCircle, XCircle, Minus } from 'lucide-react';
import parse from 'html-react-parser';

// Extract all questions with correct answers from test parts
function extractQuestions(parts: TestPart[]): Array<{ num: number; text: string; answer: string; altAnswers?: string[]; partTitle: string; partType: string; content?: string }> {
  const questions: Array<{ num: number; text: string; answer: string; altAnswers?: string[]; partTitle: string; partType: string; content?: string }> = [];
  for (const part of parts) {
    if (part.type === 'mixed' && part.nestedParts && part.nestedParts.length > 0) {
      for (const np of part.nestedParts) {
        for (const q of np.questions || []) {
          questions.push({ num: q.questionNumber, text: q.text, answer: q.answer || '', altAnswers: q.alternativeAnswers, partTitle: part.title, partType: np.type, content: np.content });
        }
      }
    } else {
      for (const q of part.questions || []) {
        questions.push({ num: q.questionNumber, text: q.text, answer: q.answer || '', altAnswers: q.alternativeAnswers, partTitle: part.title, partType: part.type, content: part.content });
      }
    }
  }
  return questions;
}

function isCorrect(userAns: string, correctAns: string, altAnswers?: string[]): boolean {
  const u = normalizeAnswer(userAns);
  const c = normalizeAnswer(correctAns);
  if (u === c && c !== '') return true;
  if (altAnswers) return altAnswers.some(a => normalizeAnswer(a) === u && u !== '');
  return false;
}

// Render gap_fill content with answer comparison (read-only)
function GapFillReview({ content, userAnswers, questions }: { content: string; userAnswers: Record<string, string>; questions: Array<{ num: number; answer: string; altAnswers?: string[] }> }) {
  let blankIdx = 0;
  let processed = (content || '').replace(/\(BLANK\)/g, () => {
    const q = questions[blankIdx++];
    return q ? `{${q.num}}` : '(BLANK)';
  });
  const clean = processed.replace(/\[cite[^\]]*\]/ig, '').replace(/\n/g, '<br/>');

  const opts = {
    replace: (domNode: any) => {
      if (domNode.type === 'text') {
        const text = domNode.data;
        if (/\{\d+\}/.test(text)) {
          const parts = text.split(/(\{\d+\})/g);
          return (
            <React.Fragment>
              {parts.map((part: string, i: number) => {
                const m = part.match(/^\{(\d+)\}$/);
                if (m) {
                  const qNum = m[1];
                  const userVal = userAnswers[qNum] || '';
                  const qInfo = questions.find(q => q.num === parseInt(qNum));
                  const correct = qInfo ? isCorrect(userVal, qInfo.answer, qInfo.altAnswers) : false;
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded border text-xs font-semibold ${correct ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                      <span className="font-mono text-[10px] text-slate-400 mr-1">{qNum}</span>
                      {userVal || '—'}
                      {correct ? <CheckCircle className="w-3 h-3 text-emerald-500 ml-0.5" /> : <XCircle className="w-3 h-3 text-red-500 ml-0.5" />}
                      {!correct && qInfo?.answer && <span className="text-emerald-600 dark:text-emerald-400 ml-1">({qInfo.answer})</span>}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </React.Fragment>
          );
        }
      }
    }
  };

  return (
    <div className="leading-[2.8] text-sm text-slate-700 dark:text-slate-300">
      {parse(clean, opts)}
    </div>
  );
}

// Answer comparison table for non-gap-fill parts
function AnswerTable({ questions, userAnswers, sectionLabel }: { questions: Array<{ num: number; text: string; answer: string; altAnswers?: string[]; partTitle: string; partType: string; content?: string }>; userAnswers: Record<string, string>; sectionLabel: string }) {
  if (questions.length === 0) return null;
  // Group by partTitle
  const grouped: Record<string, typeof questions> = {};
  for (const q of questions) {
    if (!grouped[q.partTitle]) grouped[q.partTitle] = [];
    grouped[q.partTitle].push(q);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">{sectionLabel} — Javoblar Taqqoslash</h3>
      {Object.entries(grouped).map(([partTitle, qs]) => {
        // Check if this part has gap_fill content
        const isGapFill = qs[0]?.partType === 'gap_fill' || qs[0]?.partType === 'gap_fill_missing' || qs[0]?.partType === 'gap_input';
        const content = qs[0]?.content;

        return (
          <div key={partTitle} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{partTitle}</span>
            </div>
            {isGapFill && content ? (
              <div className="p-4">
                <GapFillReview content={content} userAnswers={userAnswers} questions={qs.map(q => ({ num: q.num, answer: q.answer, altAnswers: q.altAnswers }))} />
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <th className="px-4 py-2.5 text-left w-16">Savol</th>
                    <th className="px-4 py-2.5 text-left">O'quvchi javobi</th>
                    <th className="px-4 py-2.5 text-left">To'g'ri javob</th>
                    <th className="px-4 py-2.5 text-center w-20">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {qs.map(q => {
                    const userVal = userAnswers[String(q.num)] || '';
                    const ok = isCorrect(userVal, q.answer, q.altAnswers);
                    const empty = !userVal.trim();
                    return (
                      <tr key={q.num} className={ok ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : empty ? '' : 'bg-red-50/30 dark:bg-red-950/10'}>
                        <td className="px-4 py-2.5 font-bold text-slate-500">Q{q.num}</td>
                        <td className={`px-4 py-2.5 font-semibold ${ok ? 'text-emerald-700 dark:text-emerald-300' : empty ? 'text-slate-400 italic' : 'text-red-700 dark:text-red-300'}`}>
                          {userVal || '(Javob berilmagan)'}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{q.answer}</td>
                        <td className="px-4 py-2.5 text-center">
                          {ok ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold"><CheckCircle className="w-3 h-3" /> To'g'ri</span>
                          ) : empty ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-[10px] font-bold"><Minus className="w-3 h-3" /> Bo'sh</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold"><XCircle className="w-3 h-3" /> Noto'g'ri</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [writingScore, setWritingScore] = useState(0);
  const [writingFeedback, setWritingFeedback] = useState('');

  useEffect(() => {
    const load = async () => {
      let allSubs: Submission[];
      try {
        allSubs = await getSubmissionsAsync();
      } catch {
        allSubs = getSubmissions();
      }
      setSubmissions(allSubs);
      const subId = searchParams.get('id');
      if (subId) {
        const found = allSubs.find(s => s.id === subId);
        if (found) handleSelectSubmission(found);
      }
    };
    load();
  }, [searchParams]);

  const handleSelectSubmission = async (sub: Submission) => {
    setSelectedSub(sub);
    setWritingScore(sub.writingScore || 0);
    setWritingFeedback(sub.writingFeedback || '');
    // Load associated test for answer comparison
    try {
      const test = await getTestByIdAsync(sub.testId) || getTestById(sub.testId);
      setSelectedTest(test || null);
    } catch {
      const test = getTestById(sub.testId);
      setSelectedTest(test || null);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    const updated: Submission = { ...selectedSub, writingScore, writingFeedback, isGraded: true };
    await saveSubmission(updated);
    setSelectedSub(updated);
    try { setSubmissions(await getSubmissionsAsync()); } catch { setSubmissions(getSubmissions()); }
    toast.success('Writing muvaffaqiyatli baholandi!');
  };

  const wordCount = (text?: string) => text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  // ===== DETAIL VIEW =====
  if (selectedSub) {
    const listeningQs = selectedTest ? extractQuestions(selectedTest.listeningParts) : [];
    const readingQs = selectedTest ? extractQuestions(selectedTest.readingParts) : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedSub(null); setSelectedTest(null); router.replace('/admin/submissions'); }}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Natijani Tekshirish</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{selectedSub.lastName} {selectedSub.firstName} — {selectedSub.testTitle}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Scores */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4">Avtomatik Baholar</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Listening</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <p className="text-xs text-slate-500">To'g'ri: <strong className="text-slate-800 dark:text-slate-200">{selectedSub.listeningCorrect}/{selectedSub.listeningTotal}</strong></p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{selectedSub.listeningCEFR}<span className="text-xs text-slate-400 font-normal">/75</span></p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Reading</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <p className="text-xs text-slate-500">To'g'ri: <strong className="text-slate-800 dark:text-slate-200">{selectedSub.readingCorrect}/{selectedSub.readingTotal}</strong></p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{selectedSub.readingCEFR}<span className="text-xs text-slate-400 font-normal">/75</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Listening Answer Comparison */}
            {listeningQs.length > 0 && (
              <AnswerTable questions={listeningQs} userAnswers={selectedSub.answers} sectionLabel="Listening" />
            )}

            {/* Reading Answer Comparison */}
            {readingQs.length > 0 && (
              <AnswerTable questions={readingQs} userAnswers={selectedSub.answers} sectionLabel="Reading" />
            )}

            {/* Writing Answers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors">
              <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider">Writing Responses</h3>
              {[
                { key: 'w-part-1-1', label: 'Task 1.1: Email' },
                { key: 'w-part-1-2', label: 'Task 1.2: Diagram' },
                { key: 'w-part-2', label: 'Task 2: Essay' },
              ].map(task => (
                <div key={task.key}>
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-t-xl">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{task.label}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const text = selectedSub.writingAnswers[task.key];
                          if (text) {
                            navigator.clipboard.writeText(text);
                            toast.success("Nusxa olindi!");
                          }
                        }}
                        className="text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Nusxa olish"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {wordCount(selectedSub.writingAnswers[task.key])} so'z
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border-x border-b border-slate-200 dark:border-slate-800 p-4 rounded-b-xl min-h-[100px] text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedSub.writingAnswers[task.key] || '(Javob yozilmagan)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">O'quvchi</h3>
              <div className="space-y-3 text-xs">
                {[
                  ['F.I.SH', `${selectedSub.lastName} ${selectedSub.firstName}`],
                  ['Imtihon', selectedSub.testTitle],
                  ['Turi', selectedSub.isPractice ? 'Mashq' : 'To\'liq Mock'],
                  ['Sana', new Date(selectedSub.submittedAt).toLocaleDateString('uz-UZ')],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <strong className="text-slate-800 dark:text-white">{val}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <Star className="w-4 h-4 text-indigo-500" /> Writingni Baholash
              </h3>
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ball (max 75)</label>
                  <input type="number" min="0" max="75" value={writingScore} onChange={e => setWritingScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-black text-center text-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Feedback</label>
                  <textarea value={writingFeedback} onChange={e => setWritingFeedback(e.target.value)} placeholder="Tavsiyalar..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 h-32 resize-none transition-colors" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
                  Saqlash
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100 uppercase tracking-wider">Topshirilgan Testlar ({submissions.length})</h2>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p>Hozircha natijalar mavjud emas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">O'quvchi</th>
                  <th className="px-6 py-4">Test</th>
                  <th className="px-6 py-4">Sana</th>
                  <th className="px-6 py-4">Listening</th>
                  <th className="px-6 py-4">Reading</th>
                  <th className="px-6 py-4">Writing</th>
                  <th className="px-6 py-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {submissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{sub.lastName} {sub.firstName}</td>
                    <td className="px-6 py-4">{sub.testTitle}</td>
                    <td className="px-6 py-4 text-xs">{new Date(sub.submittedAt).toLocaleDateString('uz-UZ')}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-mono font-bold text-xs">{sub.listeningCEFR}/75</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-xs">{sub.readingCEFR}/75</span>
                    </td>
                    <td className="px-6 py-4">
                      {sub.isGraded ? (
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-900/30">{sub.writingScore}/75</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded text-xs font-bold border border-amber-200 dark:border-amber-900/30">Kutilmoqda</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleSelectSubmission(sub)}
                        className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition font-semibold">
                        Tekshirish
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

export default function AdminSubmissions() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <SubmissionsContent />
    </Suspense>
  );
}
