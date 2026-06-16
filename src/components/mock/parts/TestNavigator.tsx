'use client';

import React from 'react';

interface QuestionRange {
  start: number;
  end: number;
}

interface TestNavigatorProps {
  parts: string[];
  activePart: number;
  currentQuestion?: number | null;
  onPartChange: (partIndex: number) => void;
  answeredIds?: string[];
  partQuestionRanges: QuestionRange[];
  onSubmit?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  disableDirectPartChange?: boolean;
}

const TestNavigator: React.FC<TestNavigatorProps> = ({
  parts = [],
  activePart = 0,
  currentQuestion = null,
  onPartChange,
  answeredIds = [],
  partQuestionRanges = [],
  onSubmit,
  onNext,
  onPrev,
  disableDirectPartChange = false,
}) => {
  if (!parts || parts.length === 0) return null;

  const answeredSet = new Set(answeredIds.map(String));

  const getPartStats = (partIndex: number) => {
    const range = partQuestionRanges[partIndex];
    if (!range) return { total: 0, answered: 0, questions: [] };

    const questions: number[] = [];
    for (let i = range.start; i <= range.end; i++) {
      questions.push(i);
    }

    const answered = questions.filter((q) =>
      answeredSet.has(String(q))
    ).length;

    return { total: questions.length, answered, questions };
  };

  const scrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`question-${qNum}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <div
        className="fixed flex items-center gap-[1px]"
        style={{ bottom: 'calc(56px + 15px)', right: '16px', zIndex: 41 }}
      >
        <button
          onClick={onPrev}
          disabled={!onPrev}
          className="flex items-center justify-center w-[54px] h-[54px] bg-black hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors outline-none border border-gray-700"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={!onNext}
          className="flex items-center justify-center w-[54px] h-[54px] bg-black hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors outline-none border border-gray-700"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-14 flex items-stretch select-none"
        style={{
          zIndex: 40, background: 'var(--test-nav-bg, #ffffff)', color: 'var(--test-nav-fg, #111111)',
          borderTop: '1px solid var(--test-border, #d1d5db)',
        }}
      >
        {parts.map((label, idx) => {
          const stats = getPartStats(idx);
          const isActive = idx === activePart;

          if (isActive) {
            return (
              <div
                key={idx}
                className="flex-1 flex items-center gap-2 px-4 overflow-hidden"
                style={{ borderRight: '1px solid var(--test-border, #d1d5db)' }}
              >
                <span className="font-bold text-[13px] whitespace-nowrap mr-3 shrink-0" style={{ color: 'var(--test-nav-fg, #111111)' }}>
                  {label}
                </span>

                <div className="flex items-center gap-[5px] overflow-x-auto py-1">
                  {stats.questions.map((qNum) => {
                    const isAnswered = answeredSet.has(String(qNum));
                    const isCurrent = currentQuestion === qNum;

                    return (
                      <button
                        key={qNum}
                        onClick={() => scrollToQuestion(qNum)}
                        className={`flex items-center justify-center min-w-[28px] h-[42px] px-1 text-[16px] font-semibold shrink-0 outline-none cursor-pointer transition-colors`}
                        style={{
                          border: isCurrent ? '2px solid #2563eb' : `1px solid var(--test-border, #d1d5db)`,
                          background: isCurrent ? 'var(--test-bg, #ffffff)' : isAnswered ? '#dbeafe' : 'var(--test-bg, #ffffff)',
                          color: isCurrent ? '#2563eb' : 'var(--test-fg, #111111)',
                        }}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => {
                if (!disableDirectPartChange) {
                  onPartChange(idx);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 transition-colors outline-none ${disableDirectPartChange ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                }`}
              style={{
                borderRight: '1px solid var(--test-border, #d1d5db)', background: 'var(--test-nav-bg, #ffffff)',
                color: 'var(--test-nav-fg, #111111)',
              }}
            >
              <span className="font-bold text-[13px] opacity-60 whitespace-nowrap">{label}</span>
              <span className="text-[11px] opacity-40 whitespace-nowrap">{stats.answered} of {stats.total}</span>
            </button>
          );
        })}

        {onSubmit && (
          <div className="flex items-center px-4 shrink-0" style={{ borderLeft: '1px solid var(--test-border, #d1d5db)' }}>
            <button
              onClick={onSubmit}
              className="flex items-center justify-center w-9 h-9 border rounded border-gray-300 hover:bg-gray-100 transition-colors outline-none"
              style={{
                background: 'var(--test-nav-bg, #ffffff)', color: 'var(--test-nav-fg, #111111)',
              }}
            >
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TestNavigator;
