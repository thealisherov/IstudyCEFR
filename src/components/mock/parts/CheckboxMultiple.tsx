'use client';

import React from 'react';

interface Question {
  id: string;
  numbers: number[];
  text: string;
  fullOptions?: string[];
}

interface CheckboxMultipleProps {
  data: {
    id: string;
    hasPerQuestionOptions?: boolean;
    options?: string[];
    questions: Question[];
  };
  onAnswer: (questionId: string, value: string) => void;
  userAnswers?: Record<string, string>;
}

const CheckboxMultiple: React.FC<CheckboxMultipleProps> = ({ data, onAnswer, userAnswers = {} }) => {
  const extractLetter = (optStr: string) => {
    const match = optStr.match(/^([A-Z])[\.\s:\)]/);
    return match ? match[1] : optStr;
  };

  const handleToggle = (qListId: string, value: string, maxAllowed: number, questionNumbers: number[]) => {
    const currentSelections = questionNumbers
      .map((num) => userAnswers[String(num)])
      .filter((v) => v && v.trim() !== '');

    let nextSelections: string[];
    if (currentSelections.includes(value)) {
      nextSelections = currentSelections.filter((v) => v !== value);
    } else {
      if (currentSelections.length < maxAllowed) {
        nextSelections = [...currentSelections, value];
      } else {
        return;
      }
    }

    nextSelections.sort();

    questionNumbers.forEach((num, index) => {
      onAnswer(String(num), nextSelections[index] || '');
    });
  };

  return (
    <div className="mb-8 font-sans">
      <div className="space-y-10">
        {data.questions.map((q) => {
          const qListId = q.id;
          const questionNumbers = q.numbers || [];
          const maxAllowed = questionNumbers.length;

          const currentSelections = questionNumbers
            .map((num) => userAnswers[String(num)])
            .filter((v) => v && v.trim() !== '');

          const isAtLimit = currentSelections.length >= maxAllowed;
          const numbersLabel = questionNumbers.length > 1
            ? `${questionNumbers[0]}–${questionNumbers[questionNumbers.length - 1]}`
            : String(questionNumbers[0]);

          const usePerQuestionOptions = data.hasPerQuestionOptions && q.fullOptions;
          const displayOptions = usePerQuestionOptions ? (q.fullOptions || []) : (data.options || []);

          return (
            <div key={qListId} id={`question-${questionNumbers[0]}`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2px 8px', border: '1.5px solid #222', borderRadius: 2,
                    fontWeight: 700, fontSize: '0.98em', color: 'var(--test-fg, #111)',
                    whiteSpace: 'nowrap', flexShrink: 0, minWidth: 36,
                  }}
                >
                  {numbersLabel}
                </span>
                <div
                  style={{ fontSize: '1em', fontWeight: 400, lineHeight: 1.55, color: 'var(--test-fg, #111)' }}
                  dangerouslySetInnerHTML={{ __html: q.text }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {displayOptions.map((opt, idx) => {
                  const value = usePerQuestionOptions ? extractLetter(opt) : opt;
                  const isChecked = currentSelections.includes(value);
                  const isDisabled = !isChecked && isAtLimit;
                  const labelText = opt.replace(/^[A-Z][\.\s:\)]\s*/, '').trim();

                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
                        background: isChecked ? '#dbeafe' : 'transparent',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1, userSelect: 'none',
                        transition: 'background 0.12s', borderRadius: 2,
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked && !isDisabled) e.currentTarget.style.background = '#f0f7ff';
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked && !isDisabled) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && handleToggle(qListId, value, maxAllowed, questionNumbers)}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        <div
                          style={{
                            width: 18, height: 18, border: isChecked ? '2px solid #2563eb' : '2px solid #9ca3af',
                            borderRadius: 3, background: isChecked ? '#2563eb' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.12s',
                          }}
                        >
                          {isChecked && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '1em', lineHeight: 1.5,
                          color: isChecked ? '#1e40af' : isDisabled ? '#9ca3af' : 'var(--test-fg, #111)',
                          fontWeight: isChecked ? 500 : 400,
                        }}
                      >
                        {labelText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckboxMultiple;
