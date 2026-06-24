import { create } from 'zustand';
import { Test, SectionType } from '@/types/test';

interface TestState {
  // Student Info
  firstName: string;
  lastName: string;
  
  // Test Configuration
  test: Test | null;
  isPractice: boolean;
  practiceSection?: SectionType;
  practicePartIndex?: number;
  
  // Active state
  currentSection: SectionType;
  currentPartIndex: number;
  currentQuestion: number | null;
  remainingTime: number; // in seconds
  answers: Record<string, string>; // e.g. { "1": "A", "2": "capital" }
  writingAnswers: Record<string, string>; // e.g. { "w-part-1-1": "...", "w-part-2": "..." }
  isTestStarted: boolean;
  isTestSubmitted: boolean;
  isBreak: boolean;
  breakType: 'listening' | 'reading' | null;

  // Actions
  setName: (firstName: string, lastName: string) => void;
  startTest: (
    test: Test, 
    mode: 'full' | 'practice', 
    practiceSection?: SectionType, 
    practicePartIndex?: number
  ) => void;
  setAnswer: (questionId: string, value: string) => void;
  setWritingAnswer: (partId: string, value: string) => void;
  setCurrentPartIndex: (index: number) => void;
  setCurrentQuestion: (qNum: number | null) => void;
  goToNextPart: () => void;
  goToPrevPart: () => void;
  goToNextSection: () => void;
  tickTimer: () => void;
  submitTest: () => void;
  exitTest: () => void;
  loadSavedState: (testId: string, test: Test) => boolean;
}

const STORAGE_KEY_PREFIX = 'cefr_test_';

export const useTestStore = create<TestState>((set, get) => {
  // Helper to persist state
  const saveStateToStorage = (state: Partial<TestState>) => {
    const { test, firstName, lastName, currentSection, currentPartIndex, answers, writingAnswers, remainingTime, isPractice, practiceSection, practicePartIndex, isTestStarted, isTestSubmitted, isBreak, breakType } = get();
    if (!test) return;

    const key = `${STORAGE_KEY_PREFIX}${test.id}`;
    const dataToSave = {
      firstName,
      lastName,
      currentSection,
      currentPartIndex,
      answers,
      writingAnswers,
      remainingTime,
      isPractice,
      practiceSection,
      practicePartIndex,
      isTestStarted,
      isTestSubmitted,
      isBreak,
      breakType,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(dataToSave));
  };

  return {
    firstName: '',
    lastName: '',
    test: null,
    isPractice: false,
    currentSection: 'listening',
    currentPartIndex: 0,
    currentQuestion: null,
    remainingTime: 0,
    answers: {},
    writingAnswers: {},
    isTestStarted: false,
    isTestSubmitted: false,
    isBreak: false,
    breakType: null,

    setName: (firstName, lastName) => {
      set({ firstName, lastName });
    },

    startTest: (test, mode, practiceSection, practicePartIndex) => {
      const isPractice = mode === 'practice';
      let currentSection: SectionType = 'listening';
      let remainingTime = test.listeningTime * 60;

      if (isPractice && practiceSection) {
        currentSection = practiceSection;
        if (practiceSection === 'reading') {
          remainingTime = test.readingTime * 60;
        } else if (practiceSection === 'writing') {
          remainingTime = test.writingTime * 60;
        }
      }

      set({
        test,
        isPractice,
        practiceSection,
        practicePartIndex,
        currentSection,
        currentPartIndex: isPractice && practicePartIndex !== undefined ? practicePartIndex : 0,
        currentQuestion: null,
        remainingTime,
        answers: {},
        writingAnswers: {},
        isTestStarted: true,
        isTestSubmitted: false,
        isBreak: false,
        breakType: null,
      });

      saveStateToStorage({});
    },

    setAnswer: (questionId, value) => {
      set((state) => {
        const nextAnswers = { ...state.answers, [questionId]: value };
        const updated = { answers: nextAnswers };
        setTimeout(() => saveStateToStorage(updated), 0);
        return updated;
      });
    },

    setWritingAnswer: (partId, value) => {
      set((state) => {
        const nextWritingAnswers = { ...state.writingAnswers, [partId]: value };
        const updated = { writingAnswers: nextWritingAnswers };
        setTimeout(() => saveStateToStorage(updated), 0);
        return updated;
      });
    },

    setCurrentPartIndex: (index) => {
      set({ currentPartIndex: index, currentQuestion: null });
      setTimeout(() => saveStateToStorage({}), 0);
    },

    setCurrentQuestion: (qNum) => {
      set({ currentQuestion: qNum });
    },

    goToNextPart: () => {
      const { test, currentSection, currentPartIndex, isPractice } = get();
      if (!test) return;

      if (isPractice) {
        // Practice mode doesn't navigate parts unless there is another part in practice (should not normally navigate)
        return;
      }

      let maxParts = 0;
      if (currentSection === 'listening') maxParts = test.listeningParts.length;
      else if (currentSection === 'reading') maxParts = test.readingParts.length;
      else if (currentSection === 'writing') maxParts = test.writingParts.length;

      if (currentPartIndex < maxParts - 1) {
        set({ currentPartIndex: currentPartIndex + 1, currentQuestion: null });
        setTimeout(() => saveStateToStorage({}), 0);
      } else {
        // Go to next section
        get().goToNextSection();
      }
    },

    goToPrevPart: () => {
      const { currentPartIndex, isPractice } = get();
      if (isPractice) return;

      if (currentPartIndex > 0) {
        set({ currentPartIndex: currentPartIndex - 1, currentQuestion: null });
        setTimeout(() => saveStateToStorage({}), 0);
      }
    },

    goToNextSection: () => {
      const { test, currentSection, isPractice, isBreak, breakType } = get();
      if (!test || isPractice) return;

      if (isBreak) {
        if (breakType === 'listening') {
          set({
            isBreak: false,
            breakType: null,
            currentSection: 'reading',
            currentPartIndex: 0,
            currentQuestion: null,
            remainingTime: test.readingTime * 60,
          });
        } else if (breakType === 'reading') {
          set({
            isBreak: false,
            breakType: null,
            currentSection: 'writing',
            currentPartIndex: 0,
            currentQuestion: null,
            remainingTime: test.writingTime * 60,
          });
        }
      } else {
        if (currentSection === 'listening') {
          const bTime = test.listeningBreakTime || 0;
          if (bTime > 0) {
            set({ isBreak: true, breakType: 'listening', remainingTime: bTime * 60 });
          } else {
            set({
              currentSection: 'reading',
              currentPartIndex: 0,
              currentQuestion: null,
              remainingTime: test.readingTime * 60,
            });
          }
        } else if (currentSection === 'reading') {
          const bTime = test.readingBreakTime || 0;
          if (bTime > 0) {
            set({ isBreak: true, breakType: 'reading', remainingTime: bTime * 60 });
          } else {
            set({
              currentSection: 'writing',
              currentPartIndex: 0,
              currentQuestion: null,
              remainingTime: test.writingTime * 60,
            });
          }
        } else {
          // Already on writing, let the UI handle the submission
          // (page.tsx will watch for remainingTime === 0 or trigger it)
        }
      }
      setTimeout(() => saveStateToStorage({}), 0);
    },

    tickTimer: () => {
      const { remainingTime, isTestSubmitted, isTestStarted } = get();
      if (!isTestStarted || isTestSubmitted) return;

      if (remainingTime <= 1) {
        // Time expired
        set({ remainingTime: 0 });
        const { currentSection, isPractice, isBreak } = get();
        if (isPractice || (currentSection === 'writing' && !isBreak)) {
          // page.tsx will catch remainingTime === 0 and trigger handleSubmitExam
        } else {
          get().goToNextSection();
        }
      } else {
        set({ remainingTime: remainingTime - 1 });
        // Periodically save
        if (remainingTime % 5 === 0) {
          saveStateToStorage({});
        }
      }
    },

    submitTest: () => {
      const { test } = get();
      if (!test) return;

      set({ isTestSubmitted: true, remainingTime: 0 });
      
      // Clear storage
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${test.id}`);
    },

    exitTest: () => {
      const { test } = get();
      if (test) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${test.id}`);
      }
      set({
        firstName: '',
        lastName: '',
        test: null,
        isPractice: false,
        isTestStarted: false,
        isTestSubmitted: false,
        isBreak: false,
        breakType: null,
        answers: {},
        writingAnswers: {},
        currentPartIndex: 0,
        currentQuestion: null,
      });
    },

    loadSavedState: (testId, test) => {
      if (typeof window === 'undefined') return false;

      const key = `${STORAGE_KEY_PREFIX}${testId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return false;

      try {
        const data = JSON.parse(stored);
        
        // Don't load if state is too old (e.g. > 24 hours) or already submitted
        if (data.isTestSubmitted || (Date.now() - data.timestamp > 24 * 60 * 60 * 1000)) {
          localStorage.removeItem(key);
          return false;
        }

        set({
          test,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          isPractice: data.isPractice || false,
          practiceSection: data.practiceSection,
          practicePartIndex: data.practicePartIndex,
          currentSection: data.currentSection || 'listening',
          currentPartIndex: data.currentPartIndex || 0,
          currentQuestion: null,
          remainingTime: data.remainingTime || 0,
          answers: data.answers || {},
          writingAnswers: data.writingAnswers || {},
          isTestStarted: data.isTestStarted || false,
          isTestSubmitted: data.isTestSubmitted || false,
          isBreak: data.isBreak || false,
          breakType: data.breakType || null,
        });
        return true;
      } catch {
        return false;
      }
    }
  };
});
