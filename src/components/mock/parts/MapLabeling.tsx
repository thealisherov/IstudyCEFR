'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Question {
  id?: string;
  text: string;
}

interface MapLabelingProps {
  data: {
    id: string;
    instruction?: string;
    imageUrl?: string;
    options?: string[];
    optionDescriptions?: string[];
    questions: Question[];
  };
  onAnswer: (questionId: string, value: string) => void;
  startIndex?: number;
  userAnswers?: Record<string, string>;
  hideImage?: boolean;
  hideInstruction?: boolean;
}

function parseOpt(raw: string, fallbackLetter?: string): { letter: string; desc: string } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^([A-Za-z])[.):\-]\s*(.+)$/);
  if (m) return { letter: m[1].toUpperCase(), desc: m[2].trim() };
  if (/^[A-Za-z]$/.test(trimmed)) return { letter: trimmed.toUpperCase(), desc: '' };
  if (fallbackLetter) return { letter: fallbackLetter.toUpperCase(), desc: trimmed };
  return { letter: trimmed, desc: '' };
}

const MapLabeling: React.FC<MapLabelingProps> = ({
  data,
  onAnswer,
  startIndex = 1,
  userAnswers = {},
  hideImage = false,
  hideInstruction = false
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
  const fullOptions: { letter: string; desc: string }[] =
    data.optionDescriptions && data.optionDescriptions.length > 0
      ? data.optionDescriptions.map((d, i) => parseOpt(d, optionLetters[i]))
      : optionLetters.map((opt) => parseOpt(opt));

  return (
    <div className="font-sans" ref={containerRef}>
      {/* Instruction */}
      {!hideInstruction && data.instruction && (
        <div className="mb-5 text-sm leading-relaxed font-medium" style={{ color: 'var(--test-fg)' }}>
          <div dangerouslySetInnerHTML={{ __html: data.instruction }} />
        </div>
      )}

      {/* Split layout: Image + Questions */}
      <div className={`${!hideImage && data.imageUrl ? 'flex flex-col lg:flex-row gap-6' : ''}`}>
        {/* Left: Map Image */}
        {!hideImage && data.imageUrl && (
          <div className="lg:w-1/2 shrink-0">
            <div className="sticky top-4 rounded-2xl border shadow-sm p-1" style={{ backgroundColor: 'var(--test-bg)', borderColor: 'var(--test-border)' }}>
              <img
                src={data.imageUrl}
                alt="Map / Plan"
                className="w-full h-auto block rounded-2xl"
                style={{ maxWidth: '100%' }}
                draggable={false}
              />
            </div>
          </div>
        )}

        {/* Right: Questions with dropdowns */}
        <div className={`flex-1 ${!hideImage && data.imageUrl ? '' : 'max-w-3xl'}`}>
          <div className="space-y-2.5">
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
                  className="flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 relative"
                  style={{ 
                    backgroundColor: isOpen ? 'var(--test-bg)' : 'transparent',
                    borderColor: isOpen ? 'var(--test-border)' : 'transparent',
                    zIndex: isOpen ? 9999 : 10
                  }}
                  onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Number badge */}
                  <span className="shrink-0 inline-flex items-center justify-center w-[2em] h-[2em] border font-bold select-none" style={{ fontSize: '1.1em', backgroundColor: 'var(--test-bg)', borderColor: 'var(--test-border)', color: 'var(--test-fg)' }}>
                    {globalNum}
                  </span>

                  {/* Question text */}
                  <div
                    className="flex-1 text-sm font-semibold leading-snug"
                    style={{ color: 'var(--test-fg)' }}
                    dangerouslySetInnerHTML={{ __html: q.text }}
                  />

                  {/* Dropdown */}
                  <div className={`relative shrink-0 ${isOpen ? 'z-[100]' : 'z-10'}`}>
                    <button
                      onClick={() => setOpenDropdown(prev => prev === questionId ? null : questionId)}
                      className="flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-medium transition-all duration-200"
                      style={{ 
                        minWidth: '190px',
                        backgroundColor: selected ? 'rgba(59, 130, 246, 0.15)' : 'var(--test-bg)',
                        borderColor: selected ? '#3b82f6' : 'var(--test-border)',
                        color: selected ? '#2563eb' : 'var(--test-fg)'
                      }}
                    >
                      {selected ? (
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="shrink-0 w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                            {selected}
                          </span>
                          {selectedFull?.desc && (
                            <span className="truncate text-xs font-semibold" style={{ color: '#2563eb' }}>
                              {selectedFull.desc}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex-1 text-xs text-left font-medium" style={{ opacity: 0.6 }}>Select an option</span>
                      )}
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ opacity: 0.5 }} />
                    </button>

                    {/* Dropdown panel */}
                    {isOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                        style={{ minWidth: '280px', backgroundColor: 'var(--test-bg)', borderColor: 'var(--test-border)' }}
                      >
                        {fullOptions.map(({ letter, desc }) => {
                          const isSel = selected === letter;
                          return (
                            <div
                              key={letter}
                              onClick={() => handleSelect(questionId, letter)}
                              className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm transition-colors duration-100"
                              style={{
                                backgroundColor: isSel ? 'rgba(37, 99, 235, 1)' : 'transparent',
                                color: isSel ? '#fff' : 'var(--test-fg)'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSel) e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSel) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <span className="shrink-0 w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center border"
                                style={{
                                  backgroundColor: isSel ? 'rgba(255, 255, 255, 0.2)' : 'var(--test-bg)',
                                  borderColor: isSel ? 'transparent' : 'var(--test-border)',
                                  color: isSel ? '#fff' : 'var(--test-fg)'
                                }}
                              >
                                {letter}
                              </span>
                              {desc && <span className="flex-1 font-medium">{desc}</span>}
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
      </div>
    </div>
  );
};

export default MapLabeling;
