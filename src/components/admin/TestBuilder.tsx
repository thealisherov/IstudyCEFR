'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Test, TestPart, WritingPart, Question, QuestionType } from '@/types/test';
import { saveTest } from '@/lib/db';
import { toast } from 'sonner';
import { Plus, Trash2, Save, FileText, Music, BookOpen, PenTool, CheckCircle, Info } from 'lucide-react';
import FileUploader from './FileUploader';
import TestPartEditor from './TestPartEditor';

interface TestBuilderProps {
  initialTest?: Test;
}

export default function TestBuilder({ initialTest }: TestBuilderProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'listening' | 'reading' | 'writing'>('info');
  
  // Test level state
  const [title, setTitle] = useState('');
  const [listeningTime, setListeningTime] = useState(30);
  const [readingTime, setReadingTime] = useState(35);
  const [writingTime, setWritingTime] = useState(40);

  // New fields
  const [testType, setTestType] = useState<'full' | 'practice'>('full');
  const [practiceSection, setPracticeSection] = useState<'listening' | 'reading' | 'writing'>('listening');
  const [listeningBreakTime, setListeningBreakTime] = useState(0);
  const [readingBreakTime, setReadingBreakTime] = useState(0);
  const [listeningAudioUrl, setListeningAudioUrl] = useState('');
  
  // Section parts state
  const [listeningParts, setListeningParts] = useState<TestPart[]>([]);
  const [readingParts, setReadingParts] = useState<TestPart[]>([]);
  
  // Writing parts state (specifically Task 1 and Task 2)
  const [wTask1Prompt, setWTask1Prompt] = useState('You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.');
  const [wTask1_1Prompt, setWTask1_1Prompt] = useState('Read this email from your English tutor. Write an email to your tutor in reply, explaining why you missed the seminar, what you did to catch up, and when you can meet him to discuss your draft essay. Write at least 80 words.');
  const [wTask1_1MinWords, setWTask1_1MinWords] = useState(80);
  const [wTask1_2Prompt, setWTask1_2Prompt] = useState('The chart below shows the number of three types of visitors to a museum between 1997 and 2012. Summarise the main trends and make comparisons where relevant. Write at least 100 words.');
  const [wTask1_2MinWords, setWTask1_2MinWords] = useState(100);

  const [wTask2Prompt, setWTask2Prompt] = useState('You should spend about 20 minutes on this task. Write an essay in response to the topic below. Write at least 250 words.');
  const [wTask2MinWords, setWTask2MinWords] = useState(250);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const testId = initialTest ? initialTest.id : 'new';

  const loadOriginalTest = () => {
    if (!initialTest) {
      setTitle('');
      setListeningTime(30);
      setReadingTime(35);
      setWritingTime(40);
      setTestType('full');
      setPracticeSection('listening');
      setListeningBreakTime(0);
      setReadingBreakTime(0);
      setListeningParts([]);
      setReadingParts([]);
      setListeningAudioUrl('');
      setWTask1Prompt('You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.');
      setWTask1_1Prompt('Read this email from your English tutor. Write an email to your tutor in reply, explaining why you missed the seminar, what you did to catch up, and when you can meet him to discuss your draft essay. Write at least 80 words.');
      setWTask1_1MinWords(80);
      setWTask1_2Prompt('The chart below shows the number of three types of visitors to a museum between 1997 and 2012. Summarise the main trends and make comparisons where relevant. Write at least 100 words.');
      setWTask1_2MinWords(100);
      setWTask2Prompt('You should spend about 20 minutes on this task. Write an essay in response to the topic below. Write at least 250 words.');
      setWTask2MinWords(250);
      return;
    }
    setTitle(initialTest.title);
    setListeningTime(initialTest.listeningTime);
    setReadingTime(initialTest.readingTime);
    setWritingTime(initialTest.writingTime);
    setTestType(initialTest.testType || 'full');
    setPracticeSection(initialTest.practiceSection || 'listening');
    setListeningBreakTime(initialTest.listeningBreakTime || 0);
    setReadingBreakTime(initialTest.readingBreakTime || 0);
    setListeningParts(initialTest.listeningParts || []);
    setReadingParts(initialTest.readingParts || []);
    
    const t1 = initialTest.writingParts.find(p => p.id === 'w-part-1');
    if (t1) {
      setWTask1Prompt(t1.prompt);
      if (t1.nestedParts && t1.nestedParts.length >= 2) {
        setWTask1_1Prompt(t1.nestedParts[0].prompt);
        setWTask1_1MinWords(t1.nestedParts[0].minWords || 80);
        setWTask1_2Prompt(t1.nestedParts[1].prompt);
        setWTask1_2MinWords(t1.nestedParts[1].minWords || 100);
      }
    }

    const t2 = initialTest.writingParts.find(p => p.id === 'w-part-2');
    if (t2) {
      setWTask2Prompt(t2.prompt);
      setWTask2MinWords(t2.minWords || 250);
    }
  };

  // Check for auto-saved draft on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const draftJson = localStorage.getItem('cefr_draft_' + testId);
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson);
        setTitle(draft.title || '');
        setListeningTime(draft.listeningTime ?? 30);
        setReadingTime(draft.readingTime ?? 35);
        setWritingTime(draft.writingTime ?? 40);
        setTestType(draft.testType || 'full');
        setPracticeSection(draft.practiceSection || 'listening');
        setListeningBreakTime(draft.listeningBreakTime ?? 0);
        setReadingBreakTime(draft.readingBreakTime ?? 0);
        setListeningParts(draft.listeningParts || []);
        setReadingParts(draft.readingParts || []);
        setListeningAudioUrl(draft.listeningAudioUrl || '');

        const t1 = draft.writingParts?.find((p: any) => p.id === 'w-part-1');
        if (t1) {
          setWTask1Prompt(t1.prompt || '');
          if (t1.nestedParts && t1.nestedParts.length >= 2) {
            setWTask1_1Prompt(t1.nestedParts[0].prompt || '');
            setWTask1_1MinWords(t1.nestedParts[0].minWords || 80);
            setWTask1_2Prompt(t1.nestedParts[1].prompt || '');
            setWTask1_2MinWords(t1.nestedParts[1].minWords || 100);
          }
        }

        const t2 = draft.writingParts?.find((p: any) => p.id === 'w-part-2');
        if (t2) {
          setWTask2Prompt(t2.prompt || '');
          setWTask2MinWords(t2.minWords || 250);
        }

        setDraftRestored(true);
        toast.info('Avtomatik saqlangan qoralama (draft) yuklandi!');
      } catch (e) {
        console.error('Error loading draft:', e);
        loadOriginalTest();
      }
    } else {
      loadOriginalTest();
    }
  }, [initialTest, testId]);

  // Auto-save draft effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const writingParts: WritingPart[] = [
      {
        id: 'w-part-1',
        title: 'Writing Task 1',
        prompt: wTask1Prompt,
        isNested: true,
        nestedParts: [
          {
            id: 'w-part-1-1',
            title: 'Task 1.1: Email Response',
            prompt: wTask1_1Prompt,
            minWords: wTask1_1MinWords,
            suggestedMinutes: 10
          },
          {
            id: 'w-part-1-2',
            title: 'Task 1.2: Diagram Description',
            prompt: wTask1_2Prompt,
            minWords: wTask1_2MinWords,
            suggestedMinutes: 10
          }
        ]
      },
      {
        id: 'w-part-2',
        title: 'Writing Task 2',
        prompt: wTask2Prompt,
        isNested: false,
        minWords: wTask2MinWords,
        suggestedMinutes: 20
      }
    ];

    const currentTest: Test = {
      id: initialTest ? initialTest.id : `test-${testId}`,
      title,
      isPublished: initialTest ? initialTest.isPublished : false,
      createdAt: initialTest ? initialTest.createdAt : new Date().toISOString(),
      testType,
      practiceSection: testType === 'practice' ? practiceSection : undefined,
      listeningBreakTime,
      readingBreakTime,
      listeningTime,
      readingTime,
      writingTime,
      listeningParts,
      readingParts,
      writingParts,
      listeningAudioUrl
    };

    const handler = setTimeout(() => {
      // Don't auto-save if everything is completely empty (uninitialized state)
      if (!title && listeningParts.length === 0 && readingParts.length === 0 && !listeningAudioUrl) {
        return;
      }
      localStorage.setItem('cefr_draft_' + testId, JSON.stringify(currentTest));
      setLastSavedTime(new Date().toLocaleTimeString());
    }, 1500);

    return () => clearTimeout(handler);
  }, [
    title,
    listeningTime,
    readingTime,
    writingTime,
    testType,
    practiceSection,
    listeningBreakTime,
    readingBreakTime,
    listeningParts,
    readingParts,
    listeningAudioUrl,
    wTask1Prompt,
    wTask1_1Prompt,
    wTask1_1MinWords,
    wTask1_2Prompt,
    wTask1_2MinWords,
    wTask2Prompt,
    wTask2MinWords,
    testId,
    initialTest
  ]);

  const discardDraft = () => {
    localStorage.removeItem('cefr_draft_' + testId);
    setDraftRestored(false);
    loadOriginalTest();
    toast.success('Qoralama o\'chirildi va asliga qaytarildi.');
  };

  // Handle adding Listening Part
  const addListeningPart = () => {
    if (listeningParts.length >= 6) {
      toast.error('Listening bo\'limida ko\'pi bilan 6 ta part bo\'lishi mumkin.');
      return;
    }
    // Generate next question starting offset
    const currentQCount = listeningParts.reduce((acc, p) => acc + p.questions.length, 0);
    const startNum = currentQCount + 1;

    const newPart: TestPart = {
      id: `l-part-${Date.now()}`,
      type: 'multiple_choice',
      title: `Listening Part ${listeningParts.length + 1}`,
      instruction: 'Listen and choose the correct answer.',
      audioUrl: '',
      questions: [
        { id: `l-q-${Date.now()}-1`, questionNumber: startNum, text: 'First question text', answer: 'A', fullOptions: ['A. ', 'B. ', 'C. '] }
      ],
      options: ['A', 'B', 'C'],
      optionDescriptions: []
    };
    setListeningParts([...listeningParts, newPart]);
  };

  // Handle adding Reading Part
  const addReadingPart = () => {
    if (readingParts.length >= 5) {
      toast.error('Reading bo\'limida ko\'pi bilan 5 ta passage bo\'lishi mumkin.');
      return;
    }
    const partNumber = readingParts.length + 1; // 1-based

    // Parts 4 and 5 use 'mixed' type (passage + multiple question blocks)
    // Parts 1-3 use simple single-type editor
    if (partNumber >= 4) {
      const newPart: TestPart = {
        id: `r-part-${Date.now()}`,
        type: 'mixed',
        title: `Reading Passage ${partNumber}`,
        passageTitle: `Passage ${partNumber}`,
        passageText: '',
        questions: [],
        nestedParts: []
      };
      setReadingParts([...readingParts, newPart]);
    } else {
      const currentQCount = readingParts.reduce((acc, p) => {
        if (p.nestedParts && p.nestedParts.length > 0) {
          return acc + p.nestedParts.reduce((a, np) => a + (np.questions?.length || 0), 0);
        }
        return acc + p.questions.length;
      }, 0);
      const startNum = currentQCount + 1;
      const newPart: TestPart = {
        id: `r-part-${Date.now()}`,
        type: 'gap_fill',
        title: `Reading Passage ${partNumber}`,
        passageTitle: `Passage ${partNumber}`,
        passageText: '<p>Write your passage here...</p>',
        instruction: 'Complete the sentences using words from the passage.',
        content: 'Sample text {1} with placeholder.',
        questions: [
          { id: `r-q-${Date.now()}-1`, questionNumber: startNum, text: 'Question 1', answer: '' }
        ]
      };
      setReadingParts([...readingParts, newPart]);
    }
  };

  const recalculateListeningNumbers = (parts: TestPart[]) => {
    let qNum = 1;
    return parts.map(part => {
      const updatedQuestions = part.questions.map(q => ({
        ...q,
        questionNumber: qNum++
      }));
      return { ...part, questions: updatedQuestions };
    });
  };

  const recalculateReadingNumbers = (parts: TestPart[]) => {
    let qNum = 1;
    return parts.map(part => {
      if (part.type === 'mixed' && part.nestedParts && part.nestedParts.length > 0) {
        const updatedNested = part.nestedParts.map(np => {
          const updatedQuestions = np.questions?.map(q => ({
            ...q,
            questionNumber: qNum++
          })) || [];
          return { ...np, questions: updatedQuestions };
        });
        return { ...part, nestedParts: updatedNested };
      } else {
        const updatedQuestions = part.questions?.map(q => ({
          ...q,
          questionNumber: qNum++
        })) || [];
        return { ...part, questions: updatedQuestions };
      }
    });
  };

  // Delete part
  const deletePart = (section: 'listening' | 'reading', index: number) => {
    if (section === 'listening') {
      const updated = listeningParts.filter((_, i) => i !== index);
      setListeningParts(recalculateListeningNumbers(updated));
    } else {
      const updated = readingParts.filter((_, i) => i !== index);
      setReadingParts(recalculateReadingNumbers(updated));
    }
  };

  // Add question to part
  const addQuestionToPart = (section: 'listening' | 'reading', partIndex: number) => {
    if (section === 'listening') {
      const copy = [...listeningParts];
      copy[partIndex] = {
        ...copy[partIndex],
        questions: [
          ...copy[partIndex].questions,
          {
            id: `q-gen-${Date.now()}`,
            questionNumber: 0,
            text: 'New question text',
            answer: 'A'
          }
        ]
      };
      setListeningParts(recalculateListeningNumbers(copy));
    } else {
      const copy = [...readingParts];
      copy[partIndex] = {
        ...copy[partIndex],
        questions: [
          ...copy[partIndex].questions,
          {
            id: `q-gen-${Date.now()}`,
            questionNumber: 0,
            text: 'New question text',
            answer: ''
          }
        ]
      };
      setReadingParts(recalculateReadingNumbers(copy));
    }
  };

  // Remove question from part
  const removeQuestionFromPart = (section: 'listening' | 'reading', partIndex: number, qIdx: number) => {
    if (section === 'listening') {
      const parts = [...listeningParts];
      parts[partIndex].questions = parts[partIndex].questions.filter((_, i) => i !== qIdx);
      // Recalculate all question numbers
      let qNum = 1;
      parts.forEach(p => {
        p.questions.forEach(q => {
          q.questionNumber = qNum++;
        });
      });
      setListeningParts(parts);
    } else {
      const parts = [...readingParts];
      parts[partIndex].questions = parts[partIndex].questions.filter((_, i) => i !== qIdx);
      let qNum = 1;
      parts.forEach(p => {
        p.questions.forEach(q => {
          q.questionNumber = qNum++;
        });
      });
      setReadingParts(parts);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      toast.error('Test sarlavhasini kiriting!');
      return;
    }

    if (publish) {
      if (listeningParts.length === 0 || readingParts.length === 0) {
        toast.error('Nashr qilish uchun kamida bitta Listening va Reading passage bo\'lishi shart.');
        return;
      }
    }

    // Compile Writing parts
    const writingParts: WritingPart[] = [
      {
        id: 'w-part-1',
        title: 'Writing Task 1',
        prompt: wTask1Prompt,
        isNested: true,
        nestedParts: [
          {
            id: 'w-part-1-1',
            title: 'Task 1.1: Email Response',
            prompt: wTask1_1Prompt,
            minWords: wTask1_1MinWords,
            suggestedMinutes: 10
          },
          {
            id: 'w-part-1-2',
            title: 'Task 1.2: Diagram Description',
            prompt: wTask1_2Prompt,
            minWords: wTask1_2MinWords,
            suggestedMinutes: 10
          }
        ]
      },
      {
        id: 'w-part-2',
        title: 'Writing Task 2',
        prompt: wTask2Prompt,
        isNested: false,
        minWords: wTask2MinWords,
        suggestedMinutes: 20
      }
    ];

    const testObject: Test = {
      id: initialTest ? initialTest.id : `test-${Date.now()}`,
      title,
      isPublished: publish ? true : (initialTest ? initialTest.isPublished : false),
      createdAt: initialTest ? initialTest.createdAt : new Date().toISOString(),
      testType,
      practiceSection: testType === 'practice' ? practiceSection : undefined,
      listeningBreakTime,
      readingBreakTime,
      listeningTime,
      readingTime,
      writingTime,
      listeningParts,
      readingParts,
      writingParts,
      listeningAudioUrl
    };

    try {
      await saveTest(testObject);
      localStorage.removeItem('cefr_draft_' + testId);
      toast.success(initialTest ? 'Test muvaffaqiyatli yangilandi!' : 'Yangi test muvaffaqiyatli saqlandi!');
      router.push('/admin/tests');
    } catch (error: any) {
      toast.error(error.message || 'Testni saqlashda xatolik yuz berdi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {initialTest ? `Tahrirlash: ${initialTest.title}` : 'Yangi Test Yaratish'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Hamma bo'limlarni sozlab chiqib testni nashr qilishingiz mumkin.</span>
            {lastSavedTime && (
              <span className="text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/30">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Avtomatik saqlandi: {lastSavedTime}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/tests')}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition border border-slate-300 dark:border-slate-700"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-xl text-xs transition border border-slate-300 dark:border-slate-700"
          >
            <Save className="w-3.5 h-3.5" />
            Qoralama (Draft) Saqlash
          </button>
          <button
            onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Nashr Qilish (Publish)
          </button>
        </div>
      </div>

      {draftRestored && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-800 dark:text-indigo-300 transition-all duration-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span>Tahrirlovchida saqlanmagan qoralama (draft) ma'lumotlari tiklandi.</span>
          </div>
          <button
            onClick={discardDraft}
            className="bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200 px-3 py-1.5 rounded-xl font-bold transition shrink-0"
          >
            Asliga Qaytarish (Discard Draft)
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === 'info' ? 'text-indigo-400 border-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:text-slate-200'
          }`}
        >
          <Info className="w-4 h-4" />
          1. Test Ma'lumotlari
        </button>
        {(testType === 'full' || practiceSection === 'listening') && (
          <button
            onClick={() => setActiveTab('listening')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'listening' ? 'text-indigo-400 border-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:text-slate-200'
            }`}
          >
            <Music className="w-4 h-4" />
            2. Listening
          </button>
        )}
        {(testType === 'full' || practiceSection === 'reading') && (
          <button
            onClick={() => setActiveTab('reading')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'reading' ? 'text-indigo-400 border-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            3. Reading
          </button>
        )}
        {(testType === 'full' || practiceSection === 'writing') && (
          <button
            onClick={() => setActiveTab('writing')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'writing' ? 'text-indigo-400 border-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            4. Writing
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl min-h-[400px]">
        {activeTab === 'info' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Test Sarlavhasi (Title)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: CEFR English Mock Exam - Set B"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Listening (min)</label>
                <input
                  type="number"
                  value={listeningTime}
                  onChange={(e) => setListeningTime(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Reading (min)</label>
                <input
                  type="number"
                  value={readingTime}
                  onChange={(e) => setReadingTime(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Writing (min)</label>
                <input
                  type="number"
                  value={writingTime}
                  onChange={(e) => setWritingTime(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800/80 pt-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Test Turi</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as 'full' | 'practice')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold cursor-pointer"
                >
                  <option value="full">To'liq Mock Test</option>
                  <option value="practice">Muayyan Bo'lim (Practice)</option>
                </select>
              </div>
              
              {testType === 'practice' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Qaysi Bo'lim?</label>
                  <select
                    value={practiceSection}
                    onChange={(e) => setPracticeSection(e.target.value as 'listening' | 'reading' | 'writing')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold cursor-pointer"
                  >
                    <option value="listening">Listening</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                  </select>
                </div>
              )}
            </div>

            {testType === 'full' && (
              <div className="grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800/80 pt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Listeningdan so'ng tanaffus (daqiqa)</label>
                  <input
                    type="number"
                    value={listeningBreakTime}
                    onChange={(e) => setListeningBreakTime(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Readingdan so'ng tanaffus (daqiqa)</label>
                  <input
                    type="number"
                    value={readingBreakTime}
                    onChange={(e) => setReadingBreakTime(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'listening' && (
          <div className="space-y-6">
            {/* Global Listening Audio Track Uploader */}
            <div className="bg-slate-50 dark:bg-slate-950/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-4">
              <h4 className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Listening Bo'limining Umumiy Audiosi</h4>
              <FileUploader
                value={listeningAudioUrl}
                onUpload={(url) => setListeningAudioUrl(url)}
                folder="audio"
                accept="audio/*"
                label="Audio Fayl (Butun bo'lim uchun bitta umumiy fayl)"
              />
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800/80">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Listening Partlari ({listeningParts.length} / 6 ta)</h4>
              <button
                type="button"
                onClick={addListeningPart}
                disabled={listeningParts.length >= 6}
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Part Qo'shish
              </button>
            </div>

            {listeningParts.map((part, pIdx) => {
              let startNum = 1;
              for (let i = 0; i < pIdx; i++) {
                startNum += listeningParts[i].questions?.length || 0;
              }
              return (
                <TestPartEditor
                  key={part.id}
                  part={part}
                  partIndex={pIdx}
                  section="listening"
                  startQuestionNumber={startNum}
                  onUpdate={(updatedPart) => {
                    const copy = [...listeningParts];
                    copy[pIdx] = updatedPart;
                    setListeningParts(recalculateListeningNumbers(copy));
                  }}
                  onDelete={() => deletePart('listening', pIdx)}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'reading' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800/80">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Reading Passage/Partlar ({readingParts.length} / 5 ta)</h4>
              <button
                type="button"
                onClick={addReadingPart}
                disabled={readingParts.length >= 5}
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Passage Qo'shish
              </button>
            </div>

            {readingParts.map((part, pIdx) => {
              let startNum = 1;
              for (let i = 0; i < pIdx; i++) {
                const prevPart = readingParts[i];
                if (prevPart.type === 'mixed' && prevPart.nestedParts && prevPart.nestedParts.length > 0) {
                  startNum += prevPart.nestedParts.reduce((acc, np) => acc + (np.questions?.length || 0), 0);
                } else {
                  startNum += prevPart.questions?.length || 0;
                }
              }
              return (
                <TestPartEditor
                  key={part.id}
                  part={part}
                  partIndex={pIdx}
                  section="reading"
                  startQuestionNumber={startNum}
                  onUpdate={(updatedPart) => {
                    const copy = [...readingParts];
                    copy[pIdx] = updatedPart;
                    setReadingParts(recalculateReadingNumbers(copy));
                  }}
                  onDelete={() => deletePart('reading', pIdx)}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'writing' && (
          <div className="space-y-6">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800/80 pb-3">Writing Tasks Configuration</h4>
            
            {/* Writing Task 1 */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <span className="text-xs font-black text-indigo-400 uppercase">Writing Task 1 (Nested Tasks)</span>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task 1 General Instructions</label>
                <textarea
                  value={wTask1Prompt}
                  onChange={(e) => setWTask1Prompt(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none h-16"
                />
              </div>

              {/* Nested task 1.1 */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Part 1.1: Email Response Prompt</span>
                <textarea
                  value={wTask1_1Prompt}
                  onChange={(e) => setWTask1_1Prompt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none h-20"
                />
                <div className="w-36">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Minimum Words</label>
                  <input
                    type="number"
                    value={wTask1_1MinWords}
                    onChange={(e) => setWTask1_1MinWords(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Nested task 1.2 */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Part 1.2: Diagram/Chart Description Prompt</span>
                <textarea
                  value={wTask1_2Prompt}
                  onChange={(e) => setWTask1_2Prompt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none h-20"
                />
                <div className="w-36">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Minimum Words</label>
                  <input
                    type="number"
                    value={wTask1_2MinWords}
                    onChange={(e) => setWTask1_2MinWords(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Writing Task 2 */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <span className="text-xs font-black text-indigo-400 uppercase">Writing Task 2 (Essay)</span>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task 2 Essay Prompt</label>
                <textarea
                  value={wTask2Prompt}
                  onChange={(e) => setWTask2Prompt(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none h-24"
                />
              </div>

              <div className="w-36">
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Minimum Words</label>
                <input
                  type="number"
                  value={wTask2MinWords}
                  onChange={(e) => setWTask2MinWords(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
