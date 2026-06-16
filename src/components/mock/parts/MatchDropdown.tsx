'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Question {
  id?: string;
  text: string;
}

interface MatchDropdownProps {
  data: {
    id: string;
    instruction?: string;
    options?: string[];
    optionDescriptions?: string[];
    questions: Question[];
  };
  onAnswer: (questionId: string, value: string) => void;
  startIndex?: number;
  layout?: 'stacked' | 'split';
  userAnswers?: Record<string, string>;
}

// Robust parser: handles "A) desc", "A. desc", "A - desc", plain letter, plain desc
function parseOpt(raw: string, fallbackLetter?: string): { letter: string; desc: string } {
  const trimmed = raw.trim();
  // Match letter followed by separator and description
  const m = trimmed.match(/^([A-Za-z])[.):\-]\s*(.+)$/);
  if (m) return { letter: m[1].toUpperCase(), desc: m[2].trim() };
  // Single letter only
  if (/^[A-Za-z]$/.test(trimmed)) return { letter: trimmed.toUpperCase(), desc: '' };
  // Plain description without letter — use fallback
  if (fallbackLetter) return { letter: fallbackLetter.toUpperCase(), desc: trimmed };
  return { letter: trimmed, desc: '' };
}

const MatchDropdown: React.FC<MatchDropdownProps> = ({
  data,
  onAnswer,
  startIndex = 1,
  userAnswers = {}
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (questionId: string, value: string) => {
    setOpenDropdown(null);
    onAnswer(questionId, value);
  };

  const optionLetters = data.options || [];

  // Build fullOptions by pairing optionDescriptions with option letters
  const fullOptions: { letter: string; desc: string }[] =
    data.optionDescriptions && data.optionDescriptions.length > 0
      ? data.optionDescriptions.map((d, i) => parseOpt(d, optionLetters[i]))
      : optionLetters.map((opt) => parseOpt(opt));

  return (
    <div className="mb-8 font-sans" ref={containerRef}>

      {/* Options reference box */}
      {fullOptions.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              List of Options
            </span>
          </div>
          <div className="px-5 py-4 bg-white grid grid-cols-1 gap-2">
            {fullOptions.map(({ letter, desc }) => (
              <div key={letter} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="shrink-0 w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-800">
                  {letter}
                </span>
                <span>{desc || letter}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-2">
        {data.questions.map((q, qIdx) => {
          const globalNum = startIndex + qIdx;
          const questionId = String(globalNum);
          const selected = userAnswers[questionId];
          const selectedFull = fullOptions.find(o => o.letter === selected);
          const isOpen = openDropdown === questionId;

          return (
            <div
              key={q.id || questionId}
              id={`question-${globalNum}`}
              className="flex items-center gap-4 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {/* Number badge */}
              <span className="shrink-0 inline-flex items-center justify-center w-[2em] h-[2em] border border-gray-800 text-gray-900 font-bold bg-white select-none" style={{ fontSize: '1.1em' }}>
                {globalNum}
              </span>

              {/* Question text */}
              <div
                className="flex-1 text-sm font-medium text-slate-800 leading-snug"
                dangerouslySetInnerHTML={{ __html: q.text }}
              />

              {/* Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenDropdown(prev => prev === questionId ? null : questionId)}
                  className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
                  }`}
                  style={{ minWidth: '200px' }}
                >
                  {selected ? (
                    <span className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="shrink-0 w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                        {selected}
                      </span>
                      <span className="truncate text-xs text-blue-800">
                        {selectedFull?.desc || selected}
                      </span>
                    </span>
                  ) : (
                    <span className="flex-1 text-xs text-left">Select an option</span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
                {isOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
                    style={{ minWidth: '360px' }}
                  >
                    {fullOptions.map(({ letter, desc }) => {
                      const isSel = selected === letter;
                      return (
                        <div
                          key={letter}
                          onClick={() => handleSelect(questionId, letter)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                            isSel ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`shrink-0 w-6 h-6 rounded text-[11px] font-extrabold flex items-center justify-center ${
                            isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {letter}
                          </span>
                          <span className="flex-1">{desc || letter}</span>
                          {isSel && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchDropdown;
