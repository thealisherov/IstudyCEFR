'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTestStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { getTestById, getTestByIdAsync, saveSubmission, getSubmissions } from '@/lib/db';
import { calculateSectionScore } from '@/lib/scoring';
import { Submission, TestPart, SectionType } from '@/types/test';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Clock, AlertTriangle, CheckCircle, Home, FileText, ChevronRight, ChevronsLeftRight, Play, Pause, Volume2, Menu, X, Check, LogOut, Wifi, Bell, Quote, Send, ZoomIn, ChevronLeft } from 'lucide-react';

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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TimerDisplay = () => {
  const remainingTime = useTestStore((state) => state.remainingTime);
  return (
    <div className="flex items-center gap-2.5 font-mono text-base px-3.5 py-1.5 rounded-xl font-bold bg-slate-100/80 dark:bg-slate-800/80" style={{ color: 'var(--test-header-fg)' }}>
      <div className="w-2 h-2 rounded-full bg-slate-400" />
      <span className="tracking-widest">{formatTime(remainingTime)}</span>
    </div>
  );
};

const BreakScreenTimer = () => {
  const remainingTime = useTestStore((state) => state.remainingTime);
  return (
    <div className="text-6xl font-black text-indigo-600 tracking-tighter tabular-nums mb-8">
      {formatTime(remainingTime)}
    </div>
  );
};

const AudioPlayer = () => {
  const test = useTestStore((state) => state.test);
  const currentSection = useTestStore((state) => state.currentSection);
  const audioUrl = test?.listeningAudioUrl;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (currentSection !== 'listening' || !audioUrl) {
      setIsPlaying(false);
      return;
    }

    let cancelled = false;
    isActiveRef.current = true;
    let monitorInterval: ReturnType<typeof setInterval> | null = null;
    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    // ===== PRIMARY: HTMLAudioElement routed through Web Audio API =====
    // This gives us both streaming (instant start) AND browser media control invisibility.
    // createMediaElementSource() detaches the audio from browser's default output,
    // routing it through AudioContext instead — Chrome media panel can't control it.
    const startStreamingPlayback = () => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl;
      audio.volume = 1;
      audio.preload = 'auto';
      // @ts-ignore
      audio.controlsList = 'nodownload nofullscreen noremoteplayback';
      audio.setAttribute('disableRemotePlayback', '');
      fallbackAudioRef.current = audio;

      // Route through Web Audio API to hide from browser media controls
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const mediaSource = ctx.createMediaElementSource(audio);
        mediaSource.connect(ctx.destination);

        // Keep AudioContext alive
        keepAliveInterval = setInterval(() => {
          if (cancelled) { if (keepAliveInterval) clearInterval(keepAliveInterval); return; }
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }, 200);
      } catch {
        // createMediaElementSource failed (CORS or browser issue) — audio still plays directly
      }

      const forcePlay = () => {
        if (cancelled || audio.ended) return;
        audio.play().catch(() => {});
      };

      // Aggressive pause interception — immediate, no requestAnimationFrame delay
      audio.addEventListener('pause', () => {
        if (!cancelled && !audio.ended) {
          // Immediate re-play to counteract browser media panel pause
          audio.play().catch(() => {});
        }
      });

      // Prevent seeking - lock current time
      let expectedTime = 0;
      audio.addEventListener('timeupdate', () => {
        if (cancelled) return;
        expectedTime = audio.currentTime;
      });
      audio.addEventListener('seeking', () => {
        if (cancelled) return;
        if (Math.abs(audio.currentTime - expectedTime) > 1) {
          audio.currentTime = expectedTime;
        }
      });

      // Prevent volume changes
      audio.addEventListener('volumechange', () => {
        if (cancelled) return;
        if (audio.volume !== 1) audio.volume = 1;
        if (audio.muted) audio.muted = false;
      });

      // Prevent rate changes
      audio.addEventListener('ratechange', () => {
        if (cancelled) return;
        if (audio.playbackRate !== 1) audio.playbackRate = 1;
      });

      // Re-create source if cleared
      audio.addEventListener('emptied', () => {
        if (!cancelled && audioUrl) {
          audio.src = audioUrl;
          forcePlay();
        }
      });

      audio.addEventListener('ended', () => {
        if (!cancelled) setIsPlaying(false);
      });

      // Handle load error — fall back to pure Web Audio API
      audio.addEventListener('error', () => {
        if (!cancelled) {
          console.warn('Streaming playback failed, falling back to Web Audio API buffer');
          startWebAudioFallback();
        }
      });

      // Start playing
      audio.play().then(() => {
        if (!cancelled) setIsPlaying(true);
      }).catch(() => {
        // autoplay blocked or CORS issue — fall back
        if (!cancelled) startWebAudioFallback();
      });

      // High-frequency monitor: re-force play every 300ms
      monitorInterval = setInterval(() => {
        if (cancelled) { if (monitorInterval) clearInterval(monitorInterval); return; }
        if (audio.paused && !audio.ended) {
          forcePlay();
        }
      }, 300);
    };

    // ===== FALLBACK: Pure Web Audio API (downloads full file then plays) =====
    const startWebAudioFallback = async () => {
      // Clean up any previous streaming attempt
      if (fallbackAudioRef.current) {
        try {
          fallbackAudioRef.current.pause();
          fallbackAudioRef.current.src = '';
        } catch {}
        fallbackAudioRef.current = null;
      }

      try {
        const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;

        const response = await fetch(audioUrl);
        if (cancelled) return;
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        sourceNodeRef.current = source;
        setIsPlaying(true);

        source.onended = () => {
          if (!cancelled) setIsPlaying(false);
        };

        // Prevent AudioContext suspension
        keepAliveInterval = setInterval(() => {
          if (cancelled) { if (keepAliveInterval) clearInterval(keepAliveInterval); return; }
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }, 200);
      } catch {
        if (!cancelled) {
          console.error('Both audio playback strategies failed');
          setIsPlaying(false);
        }
      }
    };

    // ===== Media Session API — actively fight browser controls =====
    if ('mediaSession' in navigator) {
      // Do NOT set metadata — setting it feeds Chrome's media panel title/artist
      navigator.mediaSession.metadata = null;

      // Active handlers that counteract any control attempt
      const activeForcePlay = () => {
        if (fallbackAudioRef.current && !fallbackAudioRef.current.ended) {
          fallbackAudioRef.current.play().catch(() => {});
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      };

      navigator.mediaSession.setActionHandler('pause', activeForcePlay);
      navigator.mediaSession.setActionHandler('play', activeForcePlay);
      navigator.mediaSession.setActionHandler('seekbackward', () => {});
      navigator.mediaSession.setActionHandler('seekforward', () => {});
      navigator.mediaSession.setActionHandler('seekto', () => {});
      navigator.mediaSession.setActionHandler('stop', activeForcePlay);
      navigator.mediaSession.setActionHandler('previoustrack', () => {});
      navigator.mediaSession.setActionHandler('nexttrack', () => {});
    }

    // ===== Block media keyboard shortcuts =====
    const blockMediaKeys = (e: KeyboardEvent) => {
      const blocked = [
        'MediaPlayPause', 'MediaStop', 'MediaTrackPrevious', 'MediaTrackNext',
        'AudioVolumeMute', 'AudioVolumeDown', 'AudioVolumeUp',
      ];
      if (blocked.includes(e.key) || blocked.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block spacebar on non-input elements (common media toggle)
      if (e.key === ' ' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', blockMediaKeys, true);

    // ===== Block right-click context menu on audio elements =====
    const blockContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'AUDIO' || target?.tagName === 'VIDEO') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockContextMenu, true);

    // ===== Prevent page visibility from affecting audio =====
    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (fallbackAudioRef.current && fallbackAudioRef.current.paused && !fallbackAudioRef.current.ended) {
        fallbackAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start playback
    startStreamingPlayback();

    // ===== Cleanup =====
    return () => {
      cancelled = true;
      isActiveRef.current = false;

      // Stop intervals
      if (monitorInterval) clearInterval(monitorInterval);
      if (keepAliveInterval) clearInterval(keepAliveInterval);

      // Stop Web Audio
      try {
        sourceNodeRef.current?.stop();
      } catch {}
      try {
        audioCtxRef.current?.close();
      } catch {}
      sourceNodeRef.current = null;
      audioCtxRef.current = null;

      // Stop streaming audio element
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
        fallbackAudioRef.current.src = '';
        fallbackAudioRef.current = null;
      }

      // Remove listeners
      document.removeEventListener('keydown', blockMediaKeys, true);
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clear Media Session
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        const handlers: MediaSessionAction[] = ['pause', 'play', 'seekbackward', 'seekforward', 'seekto', 'stop', 'previoustrack', 'nexttrack'];
        handlers.forEach(action => {
          try { navigator.mediaSession.setActionHandler(action, null); } catch {}
        });
      }

      setIsPlaying(false);
    };
  }, [currentSection, audioUrl]);

  if (currentSection !== 'listening' || !audioUrl) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 pointer-events-none select-none" aria-hidden="true">
      <Volume2
        className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`}
        style={{ color: 'var(--test-header-fg)', opacity: isPlaying ? 0.8 : 0.3 }}
      />
    </div>
  );
};

const SettingsMenu = ({
  theme, setTheme,
  textSize, setTextSize,
  onExit,
  onSubmit
}: {
  theme: 'black-on-white' | 'white-on-black' | 'yellow-on-black';
  setTheme: (t: any) => void;
  textSize: 'regular' | 'large' | 'xl';
  setTextSize: (s: any) => void;
  onExit: () => void;
  onSubmit?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'contrast' | 'text-size'>('main');

  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setTimeout(() => setView('main'), 200);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center transition hover:opacity-70"
        style={{ color: 'var(--test-header-fg)' }}
      >
        <Menu className="w-7 h-7" strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 font-sans ignore-theme">
          <div
            className="rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col border"
            style={{ backgroundColor: 'var(--test-bg)', color: 'var(--test-fg)', borderColor: 'var(--test-border)' }}
          >

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b relative" style={{ borderColor: 'var(--test-border)' }}>
              {view !== 'main' && (
                <button
                  onClick={() => setView('main')}
                  className="absolute left-6 flex items-center gap-1 opacity-70 hover:opacity-100 font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Back</span>
                </button>
              )}
              <h2 className="text-xl font-medium text-center w-full">{view === 'main' ? 'Options' : view === 'contrast' ? 'Contrast' : 'Text size'}</h2>
              <button onClick={() => { setIsOpen(false); setView('main'); }} className="absolute right-6 opacity-70 hover:opacity-100 transition">
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {view === 'main' && (
                <div className="space-y-6">
                  <button
                    onClick={() => { setIsOpen(false); if (onSubmit) onSubmit(); }}
                    className="w-full flex items-center justify-between bg-[#c8102e] hover:bg-[#a50d26] text-white p-4 rounded-lg font-medium transition"
                  >
                    <div className="flex items-center gap-4">
                      <Send className="w-5 h-5" />
                      <span>Go to submission page</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-80" />
                  </button>

                  <div className="border rounded-lg shadow-sm" style={{ borderColor: 'var(--test-border)' }}>
                    <button
                      onClick={() => setView('contrast')}
                      className="w-full flex items-center justify-between p-4 border-b transition hover:opacity-70"
                      style={{ borderColor: 'var(--test-border)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-gradient-to-r from-black to-white" />
                        <span className="font-medium">Contrast</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                    <button
                      onClick={() => setView('text-size')}
                      className="w-full flex items-center justify-between p-4 transition hover:opacity-70"
                    >
                      <div className="flex items-center gap-4">
                        <ZoomIn className="w-5 h-5 opacity-70" />
                        <span className="font-medium">Text size</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  </div>

                  <button
                    onClick={() => { setIsOpen(false); onExit(); }}
                    className="w-full flex items-center justify-center gap-3 p-4 border border-[#c8102e] text-[#c8102e] rounded-lg hover:bg-[#c8102e] hover:text-white transition font-bold"
                  >
                    <LogOut className="w-5 h-5" />
                    Exit test
                  </button>
                </div>
              )}

              {view === 'contrast' && (
                <div className="flex flex-col space-y-3">
                  {[
                    { id: 'black-on-white', label: 'Black on white' },
                    { id: 'white-on-black', label: 'White on black' },
                    { id: 'yellow-on-black', label: 'Yellow on black' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id as any)}
                      className="flex items-center gap-4 px-5 py-4 rounded-lg text-lg font-medium transition border"
                      style={{
                        borderColor: theme === opt.id ? 'var(--test-fg)' : 'transparent',
                        backgroundColor: theme === opt.id ? 'rgba(128,128,128,0.1)' : 'transparent'
                      }}
                    >
                      <div className="w-6 flex justify-center">{theme === opt.id && <Check className="w-5 h-5" />}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {view === 'text-size' && (
                <div className="flex flex-col space-y-3">
                  {[
                    { id: 'regular', label: 'Regular' },
                    { id: 'large', label: 'Large' },
                    { id: 'xl', label: 'Extra large' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTextSize(opt.id as any)}
                      className="flex items-center gap-4 px-5 py-4 rounded-lg text-lg font-medium transition border"
                      style={{
                        borderColor: textSize === opt.id ? 'var(--test-fg)' : 'transparent',
                        backgroundColor: textSize === opt.id ? 'rgba(128,128,128,0.1)' : 'transparent'
                      }}
                    >
                      <div className="w-6 flex justify-center">{textSize === opt.id && <Check className="w-5 h-5" />}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default function TestPage() {
  const { testId } = useParams() as { testId: string };
  const router = useRouter();
  const store = useTestStore(
    useShallow((s) => ({
      isTestStarted: s.isTestStarted,
      isTestSubmitted: s.isTestSubmitted,
      isBreak: s.isBreak,
      currentSection: s.currentSection,
      currentPartIndex: s.currentPartIndex,
      remainingTime: s.remainingTime,
      test: s.test,
      firstName: s.firstName,
      lastName: s.lastName,
      answers: s.answers,
      writingAnswers: s.writingAnswers,
      isPractice: s.isPractice,
      practiceSection: s.practiceSection,
      practicePartIndex: s.practicePartIndex,
      loadSavedState: s.loadSavedState,
      startTest: s.startTest,
      tickTimer: s.tickTimer,
      setAnswer: s.setAnswer,
      setWritingAnswer: s.setWritingAnswer,
      setCurrentPartIndex: s.setCurrentPartIndex,
      goToNextPart: s.goToNextPart,
      goToPrevPart: s.goToPrevPart,
      goToNextSection: s.goToNextSection,
      submitTest: s.submitTest,
      exitTest: s.exitTest,
    }))
  );

  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  const [theme, setTheme] = useState<'black-on-white' | 'white-on-black' | 'yellow-on-black'>('black-on-white');
  const [textSize, setTextSize] = useState<'regular' | 'large' | 'xl'>('regular');

  useEffect(() => {
    if (textSize === 'regular') document.documentElement.style.fontSize = '18px';
    if (textSize === 'large') document.documentElement.style.fontSize = '20px';
    if (textSize === 'xl') document.documentElement.style.fontSize = '24px';
    return () => { document.documentElement.style.fontSize = ''; }
  }, [textSize]);

  const themeVariables = useMemo(() => {
    switch (theme) {
      case 'white-on-black':
        return {
          '--test-bg': '#1a1a2e',
          '--test-fg': '#edebfa',
          '--test-header-bg': '#0f0f1a',
          '--test-header-fg': '#ffffff',
          '--test-border': '#42394f'
        };
      case 'yellow-on-black':
        return {
          '--test-bg': '#000000',
          '--test-fg': '#d4a434',
          '--test-header-bg': '#000000',
          '--test-header-fg': '#d4a434',
          '--test-border': '#d4a434'
        };
      case 'black-on-white':
      default:
        return {
          '--test-bg': '#ffffff',
          '--test-fg': '#1e1e2e',
          '--test-header-bg': '#ffffff',
          '--test-header-fg': '#111111',
          '--test-border': '#dfdbe8'
        };
    }
  }, [theme]);

  // Split-screen resizer state and logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50); // Initial left pane width percentage
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
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
    document.body.style.userSelect = '';
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
    const initTest = async () => {
      const dbTest = await getTestByIdAsync(testId) || getTestById(testId);
      
      if (!dbTest) {
        toast.error('Test topilmadi.');
        router.push('/');
        return;
      }

      const loaded = store.loadSavedState(testId, dbTest);
      if (!loaded) {
        // Direct entry without name, redirect back
        if (!store.firstName || !store.lastName) {
          toast.error('Testni boshlashdan oldin ism-familiyangizni kiriting.');
          router.push('/');
          return;
        }
        store.startTest(dbTest, 'full');
      }
      setLoading(false);
    };
    initTest();
  }, [testId]);

  // Handle section timers
  useEffect(() => {
    if (!store.isTestStarted || store.isTestSubmitted) return;

    const interval = setInterval(() => {
      store.tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [store.isTestStarted, store.isTestSubmitted]);

  // Auto-submit when time runs out on the final section or practice
  useEffect(() => {
    if (store.isTestStarted && !store.isTestSubmitted && store.remainingTime === 0) {
      const { currentSection, isPractice, isBreak } = store;
      if (isPractice || (currentSection === 'writing' && !isBreak)) {
        // Auto submit
        handleSubmitExam();
      }
    }
  }, [store.remainingTime, store.isTestStarted, store.isTestSubmitted, store.currentSection, store.isPractice, store.isBreak]);



  // Timer formatting extracted globally

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

  // Flattened answered question IDs list for current section
  const answeredIds = useMemo(() => {
    const prefix = `${store.currentSection}-`;
    return Object.keys(store.answers)
      .filter(key => key.startsWith(prefix) && store.answers[key] !== '')
      .map(key => key.replace(prefix, ''));
  }, [store.answers, store.currentSection]);

  const currentSectionAnswers = useMemo(() => {
    const prefix = `${store.currentSection}-`;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(store.answers)) {
      if (k.startsWith(prefix)) {
        result[k.replace(prefix, '')] = v;
      }
    }
    return result;
  }, [store.answers, store.currentSection]);

  const handlePartChange = (index: number) => {
    store.setCurrentPartIndex(index);
  };

  const handleAnswerSubmit = (qId: string, val: string) => {
    store.setAnswer(`${store.currentSection}-${qId}`, val);
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

    const listeningAnswersFiltered: Record<string, string> = {};
    const readingAnswersFiltered: Record<string, string> = {};
    for (const [k, v] of Object.entries(store.answers)) {
      if (k.startsWith('listening-')) {
        listeningAnswersFiltered[k.replace('listening-', '')] = v;
      } else if (k.startsWith('reading-')) {
        readingAnswersFiltered[k.replace('reading-', '')] = v;
      }
    }

    if (Object.keys(listeningCorrectAnswers).length > 0) {
      const score = calculateSectionScore(listeningAnswersFiltered, listeningCorrectAnswers, 'listening');
      lCorrect = score.correct;
      lTotal = score.total;
      lCEFR = score.cefrScore;
    }

    if (Object.keys(readingCorrectAnswers).length > 0) {
      const score = calculateSectionScore(readingAnswersFiltered, readingCorrectAnswers, 'reading');
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
            <p className="text-slate-500 mb-8 text-lg">Natijalaringiz tizimga muvaffaqiyatli saqlandi.</p>

            <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-8 text-center mt-6">
              <p className="text-lg font-medium text-indigo-900 mb-2">
                Sizning imtihon javoblaringiz ushbu telegram kanalga yuklanadi:
              </p>
              <a href="#" className="inline-flex items-center gap-2 font-bold text-indigo-600 text-xl hover:text-indigo-700 transition">
                @SizningKanal
              </a>
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
          <BreakScreenTimer />
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
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'yn_ng' && (
          <TrueFalse
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'mc_one' && (
          <TrueFalse
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'mc_multi' && (
          <CheckboxMultiple
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'gap_fill' && (
          <GapFill
            data={activePart}
            onAnswer={handleAnswerSubmit}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'summary_comp' && (
          <GapFill
            data={activePart}
            onAnswer={handleAnswerSubmit}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'match_info' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'match_features' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={currentSectionAnswers}
          />
        )}
        {activePart.type === 'match_headings' && (
          <MatchDropdown
            data={activePart as any}
            onAnswer={handleAnswerSubmit}
            startIndex={partQuestionRanges[store.currentPartIndex]?.start}
            userAnswers={currentSectionAnswers}
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
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {(subPart.type === 'gap_fill' || subPart.type === 'gap_fill_missing' || subPart.type === 'summary_comp' || subPart.type === 'gap_input') && (
                      <GapFill
                        data={subPart}
                        onAnswer={handleAnswerSubmit}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {(subPart.type === 'match_info' || subPart.type === 'matching' || subPart.type === 'match_features' || subPart.type === 'match_headings') && (
                      <MatchDropdown
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {subPart.type === 'map_labeling' && (
                      <MapLabeling
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {(subPart.type === 'tf_ng' || subPart.type === 'yn_ng') && (
                      <TrueFalse
                        data={subPart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={subStart}
                        userAnswers={currentSectionAnswers}
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
      <style>{`
        #cefr-test-wrapper {
          background-color: var(--test-bg);
          color: var(--test-fg);
        }
        #cefr-test-wrapper .cefr-test-content .bg-white:not(.ignore-theme),
        #cefr-test-wrapper .cefr-test-content .bg-slate-50:not(.ignore-theme),
        #cefr-test-wrapper .cefr-test-content .bg-slate-100:not(.ignore-theme) {
          background-color: transparent !important;
        }
        #cefr-test-wrapper .cefr-test-content .text-slate-900,
        #cefr-test-wrapper .cefr-test-content .text-slate-800,
        #cefr-test-wrapper .cefr-test-content .text-slate-700,
        #cefr-test-wrapper .cefr-test-content .text-slate-600,
        #cefr-test-wrapper .cefr-test-content .text-slate-500,
        #cefr-test-wrapper .cefr-test-content .text-gray-900,
        #cefr-test-wrapper .cefr-test-content .text-gray-800,
        #cefr-test-wrapper .cefr-test-content .text-gray-700,
        #cefr-test-wrapper .cefr-test-content .text-gray-600,
        #cefr-test-wrapper .cefr-test-content .text-gray-500 {
          color: var(--test-fg) !important;
        }
        #cefr-test-wrapper .cefr-test-content .border-slate-200,
        #cefr-test-wrapper .cefr-test-content .border-slate-100,
        #cefr-test-wrapper .cefr-test-content .border-gray-200,
        #cefr-test-wrapper .cefr-test-content .border-gray-800,
        #cefr-test-wrapper .cefr-test-content .border-gray-400 {
          border-color: var(--test-border) !important;
        }
      `}</style>
      <div
        id="cefr-test-wrapper"
        className="min-h-screen font-sans flex flex-col justify-between overflow-hidden select-none transition-colors duration-200"
        style={{ ...themeVariables, colorScheme: theme === 'black-on-white' ? 'light' : 'dark' } as React.CSSProperties}
      >
        {/* Header */}
        <header
          className="fixed top-0 left-0 w-full h-22 border-b px-6 flex justify-between items-center z-50 select-none transition-colors duration-200"
          style={{ backgroundColor: 'var(--test-header-bg)', color: 'var(--test-header-fg)', borderColor: 'var(--test-border)' }}
        >
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight text-blue-500">
              <Image src="/istudylogo1.png" alt="iSTUDY Logo" width={56} height={56} className="rounded object-contain" />
              <span>iSTUDY<span className="ml-1" style={{ color: 'var(--test-header-fg)' }}>Mock</span></span>
            </div>
            <span className="h-8 w-[3px]" style={{ backgroundColor: 'var(--test-border)' }}></span>
            <span className="text-xl font-semibold" style={{ color: 'var(--test-header-fg)' }}>{store.firstName} {store.lastName}</span>
          </div>

          <div className="flex items-center gap-5">
            <TimerDisplay />
            <AudioPlayer />

            <button className="flex items-center justify-center transition hover:opacity-70" style={{ color: 'var(--test-header-fg)' }}>
              <Wifi className="w-6 h-6" strokeWidth={2} />
            </button>

            <button className="flex items-center justify-center transition hover:opacity-70" style={{ color: 'var(--test-header-fg)' }}>
              <Bell className="w-6 h-6" strokeWidth={2} />
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('TOGGLE_NOTES_SIDEBAR'))}
              className="flex items-center justify-center transition hover:opacity-70"
              style={{ color: 'var(--test-header-fg)' }}
              title="Eslatmalar"
            >
              <Quote className="w-6 h-6" strokeWidth={2} />
            </button>

            <SettingsMenu
              theme={theme} setTheme={setTheme}
              textSize={textSize} setTextSize={setTextSize}
              onExit={() => setShowExitModal(true)}
              onSubmit={() => setShowSubmitModal(true)}
            />
          </div>
        </header>

        {/* Content Area */}
        <TextAnnotator
          containerId={`section_${store.currentSection}_part_${activePart?.id}`}
          className="flex-1 overflow-hidden relative pt-16 cefr-test-content"
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
                      userAnswers={currentSectionAnswers}
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
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {(activePart?.type === 'gap_fill' || activePart?.type === 'gap_fill_missing' || activePart?.type === 'gap_input' || activePart?.type === 'summary_comp') && (
                      <GapFill
                        data={activePart}
                        onAnswer={handleAnswerSubmit}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {(activePart?.type === 'matching' || activePart?.type === 'match_info' || activePart?.type === 'match_features' || activePart?.type === 'match_headings') && (
                      <MatchDropdown
                        data={activePart as any}
                        onAnswer={handleAnswerSubmit}
                        startIndex={partQuestionRanges[store.currentPartIndex]?.start}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                    {activePart?.type === 'abc_checkbox' && (
                      <CheckboxMultiple
                        data={activePart as any}
                        onAnswer={handleAnswerSubmit}
                        userAnswers={currentSectionAnswers}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {store.currentSection === 'reading' && (
            isSplitReading ? (
              <div ref={containerRef} className="split-pane flex w-full h-full">
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
