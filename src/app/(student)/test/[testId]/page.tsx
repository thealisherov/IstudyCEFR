'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTestStore } from '@/lib/store';
import { getTestById, saveSubmission, getSubmissions } from '@/lib/db';
import { calculateSectionScore } from '@/lib/scoring';
import { Submission, TestPart, SectionType } from '@/types/test';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Clock, AlertTriangle, CheckCircle, Home, FileText, ChevronRight, ChevronsLeftRight } from 'lucide-react';

// Import the design components
import TrueFalse from '@/components/mock/parts/TrueFalse';
import GapFill from '@/components/mock/parts/GapFill';
import MatchDropdown from '@/components/mock/parts/MatchDropdown';
import CheckboxMultiple from '@/components/mock/parts/CheckboxMultiple';
import MapLabeling from '@/components/mock/parts/MapLabeling';
import TestNavigator from '@/components/mock/parts/TestNavigator';
import { NotesProvider } from '@/components/mock/notes/NotesProvider';
import TextAnnotator from '@/components/mock/notes/TextAnnotator';
import NotesSidebar from '@/components/mock/notes/NotesSidebar';

export default function TestPage() {
  const { testId } = useParams() as { testId: string };
  const router = useRouter();
  const store = useTestStore();

  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // Split-screen resizer state and logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50); // Initial left pane width percentage
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidthPx = e.clientX - containerRect.left;
    const newWidthPercentage = (newWidthPx / containerRect.width) * 100;

    // Boundaries: min 20%, max 80%
    if (newWidthPercentage >= 20 && newWidthPercentage <= 80) {
      setLeftWidth(newWidthPercentage);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);


  // Tab within Writing Task 1: 0 = Task 1.1, 1 = Task 1.2
  const [activeWritingTab, setActiveWritingTab] = useState(0);

  // Initialize and load test state
  useEffect(() => {
    const loaded = store.loadSavedState(testId);
    if (!loaded) {
      const dbTest = getTestById(testId);
      if (dbTest) {
        // Direct entry without name, redirect back
        if (!store.firstName || !store.lastName) {
          toast.error('Testni boshlashdan oldin ism-familiyangizni kiriting.');
          router.push('/');
          return;
        }
        store.startTest(dbTest, 'full');
      } else {
        toast.error('Test topilmadi.');
        router.push('/');
        return;
      }
    }
    setLoading(false);
  }, [testId]);

  // Handle section timers
  useEffect(() => {
    if (!store.isTestStarted || store.isTestSubmitted) return;

    const interval = setInterval(() => {
      store.tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [store.isTestStarted, store.isTestSubmitted]);



  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compile active section parts
  const activeParts = useMemo(() => {
    if (!store.test) return [];
    if (store.currentSection === 'listening') return store.test.listeningParts;
    if (store.currentSection === 'reading') return store.test.readingParts;
    if (store.currentSection === 'writing') return store.test.writingParts;
    return [];
  }, [store.test, store.currentSection]);

  const partLabels = useMemo(() => {
    return activeParts.map((p) => {
      // Strip section prefix: "Listening Part 1" → "Part 1"
      return p.title.replace(/^(Listening|Reading|Writing)\s+/i, '');
    });
  }, [activeParts]);

  // Compute question ranges for active section
  const partQuestionRanges = useMemo(() => {
    if (store.currentSection === 'writing') {
      return activeParts.map((_, idx) => ({ start: idx + 1, end: idx + 1 }));
    }

    let currentOffset = 1;
    return (activeParts as TestPart[]).map((part) => {
      let qCount = 0;
      if (part.type === 'mixed' && part.nestedParts && part.nestedParts.length > 0) {
        qCount = part.nestedParts.reduce((acc, np) => acc + (np.questions?.length || 0), 0);
      } else {
        qCount = part.questions?.length || 0;
      }
      const range = {
        start: currentOffset,
        end: currentOffset + qCount - 1
      };
      currentOffset += qCount;
      return range;
    });
  }, [activeParts, store.currentSection]);

  // Flattened answered question IDs list
  const answeredIds = useMemo(() => {
    return Object.keys(store.answers).filter(key => store.answers[key] !== '');
  }, [store.answers]);

  const handlePartChange = (index: number) => {
    store.setCurrentPartIndex(index);
  };

  const handleAnswerSubmit = (qId: string, val: string) => {
    store.setAnswer(qId, val);
  };

  const handleWritingAnswerChange = (partId: string, val: string) => {
    store.setWritingAnswer(partId, val);
  };

  const handleNext = () => {
    const maxIndex = activeParts.length - 1;
    if (store.currentPartIndex < maxIndex) {
      store.goToNextPart();
    }
    // Do nothing on the last part — no section jump or submit
  };

  const handlePrev = () => {
    if (store.currentPartIndex > 0) {
      store.goToPrevPart();
    }
    // Do nothing on the first part
  };

  const handleConfirmSubmit = () => {
    if (store.currentSection === 'writing') {
      // Writing: show final exam submit modal
      setShowSubmitModal(true);
    } else {
      // Listening/Reading: show section transition modal
      setShowSectionModal(true);
    }
  };

  const handleSectionTransition = () => {
    setShowSectionModal(false);
    store.goToNextSection();
  };

  const handleSubmitExam = async () => {
    if (!store.test) return;

    // Calculate Scores for Listening and Reading
    let lCorrect = 0, lTotal = 0, lCEFR = 0;
    let rCorrect = 0, rTotal = 0, rCEFR = 0;

    // Map correct answers
    const listeningCorrectAnswers: Record<string, { answer: string, alternativeAnswers?: string[] }> = {};
    store.test.listeningParts.forEach(part => {
      if (part.type === 'mixed' && part.nestedParts && part.nestedParts.length > 0) {
        part.nestedParts.forEach(np => {
          np.questions?.forEach(q => {
            if (q.answer) {
              listeningCorrectAnswers[String(q.questionNumber)] = {
                answer: q.answer,
                alternativeAnswers: q.alternativeAnswers
              };
            }
          });
        });
      } else {
        part.questions?.forEach(q => {
          if (q.answer) {
            listeningCorrectAnswers[String(q.questionNumber)] = {
              answer: q.answer,
              alternativeAnswers: q.alternativeAnswers
            };
          }
        });
      }
    });

    const readingCorrectAnswers: Record<string, { answer: string, alternativeAnswers?: string[] }> = {};
    store.test.readingParts.forEach(part => {
      if (part.type === 'mixed' && part.nestedParts && part.nestedParts.length > 0) {
        part.nestedParts.forEach(np => {
          np.questions?.forEach(q => {
            if (q.answer) {
              readingCorrectAnswers[String(q.questionNumber)] = {
                answer: q.answer,
                alternativeAnswers: q.alternativeAnswers
              };
            }
          });
        });
      } else {
        part.questions?.forEach(q => {
          if (q.answer) {
            readingCorrectAnswers[String(q.questionNumber)] = {
              answer: q.answer,
              alternativeAnswers: q.alternativeAnswers
            };
          }
        });
      }
    });

    if (Object.keys(listeningCorrectAnswers).length > 0) {
      const score = calculateSectionScore(store.answers, listeningCorrectAnswers, 'listening');
      lCorrect = score.correct;
      lTotal = score.total;
      lCEFR = score.cefrScore;
    }

    if (Object.keys(readingCorrectAnswers).length > 0) {
      const score = calculateSectionScore(store.answers, readingCorrectAnswers, 'reading');
      rCorrect = score.correct;
      rTotal = score.total;
      rCEFR = score.cefrScore;
    }

    const submission: Submission = {
      id: `sub-${Date.now()}`,
      testId: store.test.id,
      testTitle: store.test.title,
      firstName: store.firstName,
      lastName: store.lastName,
      startedAt: new Date().toISOString(), // Simplified
      submittedAt: new Date().toISOString(),
      isPractice: store.isPractice,
      practiceSection: store.practiceSection,
      practicePartIndex: store.practicePartIndex,
      listeningCorrect: lCorrect,
      listeningTotal: lTotal,
      listeningCEFR: lCEFR,
      readingCorrect: rCorrect,
      readingTotal: rTotal,
      readingCEFR: rCEFR,
      isGraded: false,
      answers: store.answers,
      writingAnswers: store.writingAnswers,
    };

    await saveSubmission(submission);
    store.submitTest();
    clearTestAnnotations();
    confetti({ particleCount: 150, spread: 80 });
    toast.success('Imtihon muvaffaqiyatli topshirildi!');
  };

  const clearTestAnnotations = () => {
    try {
      localStorage.removeItem(`notes_${testId}`);
      const highlightPrefix = `highlights_${testId}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(highlightPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      // ignore
    }
  };

  const handleExit = () => {
    clearTestAnnotations();
    store.exitTest();
    router.push('/');
  };

  if (loading || !store.test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Submitted / Success Page
  if (store.isTestSubmitted) {
    // Reload submission to show results
    const submissions = getSubmissions();
    const lastSub = submissions[submissions.length - 1];

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
        <header className="bg-slate-900 text-white py-4 px-6 shadow-md">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-extrabold tracking-tight">Imtihon Yakunlandi</h1>
            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition"
            >
              <Home className="w-4 h-4" />
              Bosh sahifaga qaytish
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col items-center justify-center">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center w-full max-w-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
              <CheckCircle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Imtihon Muvaffaqiyatli Yakunlandi!</h2>
            <p className="text-slate-500 mb-8">Natijalaringiz tizimga muvaffaqiyatli saqlandi. Quyida dastlabki natijalar bilan tanishing:</p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {/* Listening Score */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-left">
                <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Listening</span>
                <div className="mt-2">
                  <p className="text-xs text-slate-500">CEFR Ball</p>
                  <p className="text-3xl font-black text-blue-600">{lastSub?.listeningCEFR} <span className="text-xs text-slate-400 font-normal">/ 75</span></p>
                </div>
              </div>

              {/* Reading Score */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-left">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">Reading</span>
                <div className="mt-2">
                  <p className="text-xs text-slate-500">CEFR Ball</p>
                  <p className="text-3xl font-black text-emerald-600">{lastSub?.readingCEFR} <span className="text-xs text-slate-400 font-normal">/ 75</span></p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left mb-6">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Writing</span>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                Yozma nutq (Writing) bo'limi avtomatik baholanmaydi. Javoblaringiz admin tomonidan tekshirilgach, to'liq ballingiz e'lon qilinadi.
              </p>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-5 text-center mt-6">
              <p className="text-sm font-semibold text-indigo-800">
                Test natijalari telegram kanalimizga yuklanadi:
                <a href="#" className="font-bold text-indigo-600 underline ml-1 hover:text-indigo-700">@SizningKanal</a>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Break Screen
  if (store.isBreak) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-xl text-center max-w-md w-full">
          <Clock className="w-16 h-16 text-indigo-500 mx-auto mb-6 animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 mb-2">Tanaffus</h2>
          <p className="text-slate-500 mb-8 font-medium">Iltimos, keyingi bo'lim boshlangunicha biroz dam oling.</p>
          <div className="text-6xl font-black text-indigo-600 tracking-tighter tabular-nums mb-8">
            {formatTime(store.remainingTime)}
          </div>
        </div>
      </div>
    );
  }

  // Active Part Data
  const activePart = activeParts[store.currentPartIndex] as any;

  // Helper to count words in essay
  const getWordCount = (text?: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const isSplitReading = store.currentSection === 'reading' && (store.currentPartIndex === 3 || store.currentPartIndex === 4);

  const renderReadingQuestions = () => {
    if (!activePart) return null;
    return (
      <>
        {activePart.type === 'tf_ng' && (
          <TrueFalse
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'yn_ng' && (
          <TrueFalse
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'mc_one' && (
          <TrueFalse
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'mc_multi' && (
          <CheckboxMultiple
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'gap_fill' && (
          <GapFill
            data={activePart}
            onAnswer={handleAnswerSubmit}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'summary_comp' && (
          <GapFill
            data={activePart}
            onAnswer={handleAnswerSubmit}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'match_info' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'match_features' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'match_headings' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={store.answers}
          />
        )}
        {activePart.type === 'mixed' && (
          <div className="space-y-8">
            {(() => {
              let subOffset = partQuestionRanges[store.currentPartIndex]?.start || 1;
              return activePart.nestedParts?.map((subPart: any) => {
                const subStart = subOffset;
                const qCount = subPart.questions?.length || 0;
                subOffset += qCount;

                return (
                  <div key={subPart.id} className="border-t border-slate-200 pt-6 first:border-0 first:pt-0">
                    {subPart.instruction && (
                      <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {subPart.instruction}
                      </div>
                    )}
                    {(subPart.type === 'multiple_choice' || subPart.type === 'mc_one' || subPart.type === 'mc_multi') && (
                      <TrueFalse
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={store.answers}
                      />
                    )}
                    {(subPart.type === 'gap_fill' || subPart.type === 'gap_fill_missing' || subPart.type === 'summary_comp' || subPart.type === 'gap_input') && (
                      <GapFill
                        data={subPart}
                        onAnswer={handleAnswerSubmit}
                        userAnswers={store.answers}
                      />
                    )}
                    {(subPart.type === 'match_info' || subPart.type === 'matching' || subPart.type === 'match_features' || subPart.type === 'match_headings') && (
                      <MatchDropdown
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={store.answers}
                      />
                    )}
                    {subPart.type === 'map_labeling' && (
                      <MapLabeling
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={store.answers}
                      />
                    )}
                    {(subPart.type === 'tf_ng' || subPart.type === 'yn_ng') && (
                      <TrueFalse
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={store.answers}
                      />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </>
    );
  };

  return (
    <NotesProvider storageId={testId}>
      <div 
        className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-slate-900 text-white h-14 border-b border-slate-800 px-6 flex justify-between items-center z-50 select-none">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-sm text-blue-400">iSTUDY mock</span>
          <span className="h-4 w-[1.5px] bg-slate-700"></span>
          <span className="text-xs text-slate-300 font-semibold">{store.firstName} {store.lastName}</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('TOGGLE_NOTES_SIDEBAR'))}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded border border-slate-700"
          >
            <FileText className="w-4 h-4" />
            Eslatmalar
          </button>
          
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-sm bg-amber-950/20 px-3 py-1 rounded border border-amber-900/30">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>{formatTime(store.remainingTime)}</span>
          </div>

          <button
            onClick={() => setShowExitModal(true)}
            className="text-xs font-semibold text-slate-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded"
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* Content Area */}
      <TextAnnotator 
        containerId={`section_${store.currentSection}_part_${activePart?.id}`}
        className="flex-1 overflow-hidden relative pt-14"
      >
        {store.currentSection === 'listening' && (
          <>
            {/* Map Labeling: special split-pane layout (image left, questions right) */}
            {activePart?.type === 'map_labeling' ? (
              <div className="split-pane">
                {/* Left: Map Image */}
                <div className="pane-left">
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{activePart?.title}</h4>
                  {(activePart as any).instruction && (
                    <div className="mb-4 text-sm text-slate-600 leading-relaxed font-medium"
                      dangerouslySetInnerHTML={{ __html: (activePart as any).instruction }}
                    />
                  )}
                  {(activePart as any).imageUrl && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <img
                        src={(activePart as any).imageUrl}
                        alt="Map / Plan"
                        className="w-full h-auto block"
                        style={{ maxWidth: '100%' }}
                        draggable={false}
                      />
                    </div>
                  )}
                </div>

                {/* Right: Questions with dropdowns */}
                <div className="pane-right">
                  <MapLabeling
                    data={activePart as any}
                    onAnswer={handleAnswerSubmit}
                    startIndex={partQuestionRanges[store.currentPartIndex]?.start}
                    userAnswers={store.answers}
                    hideImage
                    hideInstruction
                  />
                </div>
              </div>
            ) : (
              /* All other listening question types: normal single column */
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-8 max-w-5xl w-full ml-0 pr-8">
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{activePart?.title}</h4>

                  {activePart?.type === 'multiple_choice' && (
                    <TrueFalse
                      data={activePart as any}
                      onAnswer={handleAnswerSubmit}
                      startIndex={partQuestionRanges[store.currentPartIndex]?.start}
                      userAnswers={store.answers}
                    />
                  )}
                  {(activePart?.type === 'gap_fill' || activePart?.type === 'gap_fill_missing' || activePart?.type === 'gap_input' || activePart?.type === 'summary_comp') && (
                    <GapFill
                      data={activePart}
                      onAnswer={handleAnswerSubmit}
                      userAnswers={store.answers}
                    />
                  )}
                  {(activePart?.type === 'matching' || activePart?.type === 'match_info' || activePart?.type === 'match_features' || activePart?.type === 'match_headings') && (
                    <MatchDropdown
                      data={activePart as any}
                      onAnswer={handleAnswerSubmit}
                      startIndex={partQuestionRanges[store.currentPartIndex]?.start}
                      userAnswers={store.answers}
                    />
                  )}
                  {activePart?.type === 'abc_checkbox' && (
                    <CheckboxMultiple
                      data={activePart as any}
                      onAnswer={handleAnswerSubmit}
                      userAnswers={store.answers}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {store.currentSection === 'reading' && (
          isSplitReading ? (
            <div ref={containerRef} className="split-pane flex w-full h-full select-none">
              {/* Left side: Passage Text */}
              <div className="pane-left overflow-y-auto" style={{ width: `${leftWidth}%`, borderRight: 'none' }}>
                {(activePart as TestPart)?.passageTitle && (
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-6 pb-4 border-b border-slate-100">
                    {(activePart as TestPart).passageTitle}
                  </h2>
                )}
                <div
                  className="text-slate-800 leading-relaxed text-sm space-y-4 [&>p]:mb-4"
                  dangerouslySetInnerHTML={{ __html: (activePart as TestPart)?.passageText || '' }}
                />
              </div>

              {/* Resizable Divider */}
              <div
                className="w-1 bg-slate-200 hover:bg-blue-500 cursor-col-resize relative flex-shrink-0 flex items-center justify-center transition-all duration-150 z-20"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute w-7 h-7 bg-white border border-slate-300 rounded-md shadow flex items-center justify-center pointer-events-none select-none text-slate-500 hover:text-slate-700">
                  <ChevronsLeftRight className="w-4 h-4" />
                </div>
              </div>

              {/* Right side: Questions */}
              <div className="pane-right overflow-y-auto" style={{ width: `${100 - leftWidth}%` }}>
                <h4 className="text-xl font-bold text-slate-900 mb-4">{activePart?.title}</h4>
                {renderReadingQuestions()}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-8 max-w-5xl w-full ml-0 pr-8 pb-24">
                <h4 className="text-xl font-bold text-slate-900 mb-4">{activePart?.title}</h4>
                {renderReadingQuestions()}
              </div>
            </div>
          )
        )}

        {store.currentSection === 'writing' && (
          <div className="split-pane">
            {/* Left side: Prompt */}
            <div className="pane-left">
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">
                {activePart?.title}
              </h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">
                Instructions:
              </p>

              {/* Check if is nested (Task 1) */}
              {(activePart as any).isNested ? (
                <div className="space-y-6">
                  <p className="text-slate-700 text-sm italic font-medium">
                    {activePart?.prompt}
                  </p>

                  {/* Tabs selector within left pane for clarity */}
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    {(activePart as any).nestedParts.map((subPart: any, idx: number) => (
                      <button
                        key={subPart.id}
                        type="button"
                        onClick={() => setActiveWritingTab(idx)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeWritingTab === idx
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                      >
                        {subPart.title}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h5 className="font-extrabold text-sm text-slate-900 mb-2">
                      {(activePart as any).nestedParts[activeWritingTab]?.title}
                    </h5>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {(activePart as any).nestedParts[activeWritingTab]?.prompt}
                    </p>
                    <div className="flex gap-4 mt-3 text-[10px] text-slate-500 font-bold uppercase">
                      <span>Min Words: {(activePart as any).nestedParts[activeWritingTab]?.minWords || 150}</span>
                      <span>Suggested Time: {(activePart as any).nestedParts[activeWritingTab]?.suggestedMinutes || 20}m</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                    {activePart?.prompt}
                  </p>
                  <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase pt-2">
                    <span>Min Words: {activePart?.minWords || 250}</span>
                    <span>Suggested Time: {activePart?.suggestedMinutes || 40}m</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Editor */}
            <div className="pane-right flex flex-col bg-slate-50 p-6">
              {(activePart as any).isNested ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase">Writing Editor: {(activePart as any).nestedParts[activeWritingTab]?.title}</span>
                    <span className="text-xs font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      Words: {getWordCount(store.writingAnswers[(activePart as any).nestedParts[activeWritingTab]?.id])}
                    </span>
                  </div>

                  <textarea
                    key={(activePart as any).nestedParts[activeWritingTab]?.id}
                    placeholder="Start typing your response here..."
                    value={store.writingAnswers[(activePart as any).nestedParts[activeWritingTab]?.id] || ''}
                    onChange={(e) => handleWritingAnswerChange((activePart as any).nestedParts[activeWritingTab]?.id, e.target.value)}
                    className="flex-1 w-full p-4 bg-white border border-slate-300 rounded-xl resize-none text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase">Writing Editor: Task 2</span>
                    <span className="text-xs font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      Words: {getWordCount(store.writingAnswers[activePart.id])}
                    </span>
                  </div>

                  <textarea
                    placeholder="Start typing your essay here..."
                    value={store.writingAnswers[activePart.id] || ''}
                    onChange={(e) => handleWritingAnswerChange(activePart.id, e.target.value)}
                    className="flex-1 w-full p-4 bg-white border border-slate-300 rounded-xl resize-none text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </TextAnnotator>

      {/* Bottom Navigator */}
      <TestNavigator
        parts={partLabels}
        activePart={store.currentPartIndex}
        onPartChange={handlePartChange}
        answeredIds={answeredIds}
        partQuestionRanges={partQuestionRanges}
        onSubmit={handleConfirmSubmit}
        onNext={store.currentPartIndex < activeParts.length - 1 ? handleNext : undefined}
        onPrev={store.currentPartIndex > 0 ? handlePrev : undefined}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-bold text-slate-900 mb-2">Testdan Chiqish</h4>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Siz haqiqatan ham testdan chiqmoqchimisiz? Chiqsangiz, barcha kiritilgan javoblaringiz o'chiriladi va test bekor qilinadi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-xs"
              >
                Orqaga qaytish
              </button>
              <button
                onClick={handleExit}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition text-xs shadow-md"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal — Final Exam (Writing only) */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-bold text-slate-900 mb-2">Imtihonni Yakunlash</h4>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Siz haqiqatan ham imtihonni yakunlab, javoblarni yubormoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-xs border border-slate-200"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  handleSubmitExam();
                }}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer rounded-lg transition text-xs shadow-md"
              >
                Topshirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Transition Modal — Listening→Reading, Reading→Writing */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <ChevronRight className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-bold text-slate-900 mb-2">
              {store.currentSection === 'listening' ? 'Reading bo\'limiga o\'tish' : 'Writing bo\'limiga o\'tish'}
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              {store.currentSection === 'listening'
                ? 'Listening bo\'limini yakunlab, Reading bo\'limiga o\'tmoqchimisiz? Ortga qaytib bo\'lmaydi.'
                : 'Reading bo\'limini yakunlab, Writing bo\'limiga o\'tmoqchimisiz? Ortga qaytib bo\'lmaydi.'
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSectionModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-xs border border-slate-200"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSectionTransition}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer rounded-lg transition text-xs shadow-md"
              >
                Davom etish
              </button>
            </div>
          </div>
        </div>
      )}
      <NotesSidebar />
    </div>
    </NotesProvider>
  );
}
