# IELTS / CEFR Mock Platform Component Designs

Ushbu faylda siz so\'ragan barcha test komponentlarining kodlari jamlangan. Ular to\'g\'ridan-to\'g\'ri loyihangizga ko\'chirib o\'tkazish uchun tayyor holatda (React + Tailwind CSS va qisman Inline CSS orqali bezatilgan).

## 1. Multiple Choice / True False (Radio Buttonlar)
Ushbu komponent odatiy radio tugmalar, shuningdek, True/False, Multiple Choice savollari uchun ishlatiladi.

```jsx
\'use client\';

import React, { useState } from \'react\';

const TrueFalse = ({ data, onAnswer, startIndex = 1, userAnswers = {} }) => {
  const handleSelect = (questionId, value) => {
    onAnswer(questionId, value);
  };

  const extractLetter = (optStr) => {
    const match = optStr.match(/^([A-Z])[.\\s:)]/);
    return match ? match[1] : optStr;
  };

  return (
    <div className="mb-8 font-sans">
      {data.optionDescriptions && data.optionDescriptions.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="space-y-1.5">
            {data.optionDescriptions.map((desc, idx) => (
              <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                {desc}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {data.questions.map((q, qIdx) => {
          const globalNum = startIndex + qIdx;
          const questionId = String(globalNum);
          const selected = userAnswers[questionId];

          const usePerQuestionOptions = data.hasPerQuestionOptions && q.fullOptions;
          const displayOptions = usePerQuestionOptions
            ? q.fullOptions
            : (data.options || []);

          return (
            <div key={q.id || questionId}>
              <div className="flex gap-4 mb-3">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-[2em] h-[2em] border border-gray-800 text-gray-900 font-bold bg-white select-none" style={{ fontSize: \'1.1em\' }}>
                    {globalNum}
                  </span>
                </div>
                
                <div 
                  className="flex-1 pt-1.5 font-medium text-gray-900 leading-normal [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2" 
                  style={{ fontSize: \'1.1em\' }}
                  dangerouslySetInnerHTML={{ __html: q.text }}
                />
              </div>

              <div className="ml-[3.5em] space-y-3">
                {displayOptions.map((opt) => {
                  const value = usePerQuestionOptions ? extractLetter(opt) : opt;
                  const displayText = opt;

                  return (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group w-fit">
                      <input
                        type="radio"
                        name={`tf_${data.id}_${questionId}`}
                        value={value}
                        checked={selected === value}
                        onChange={() => handleSelect(questionId, value)}
                        className="w-[1.2em] h-[1.2em] border-2 border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-gray-800 group-hover:text-gray-900 font-medium" style={{ fontSize: \'1.1em\' }}>
                        {displayText}
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

export default TrueFalse;
```

---

## 2. Gap Fill (Inputlar)
Matn ichidagi bo\'sh joylarga (gap filling) yozish uchun inputlar dizayni. Cursor fokusini yo\'qotmaslik uchun `useLayoutEffect` ishlatilgan.

```jsx
\'use client\';

import React, { useRef, useLayoutEffect } from \'react\';
import parse from \'html-react-parser\';

const GapFill = ({ data, onAnswer, userAnswers = {} }) => {
  const focusedId = useRef(null);

  const handleInputChange = (questionId, val) => {
    focusedId.current = questionId;
    onAnswer(questionId, val);
  };

  useLayoutEffect(() => {
    if (focusedId.current) {
      const el = document.getElementById(`gap-input-${focusedId.current}`);
      if (el && document.activeElement !== el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  });

  const options = {
    replace: (domNode) => {
      if (domNode.type === \'text\') {
        const text = domNode.data;
        if (/\\{\\d+\\}/.test(text)) {
          const parts = text.split(/(\\{\\d+\\})/g);
          return (
            <React.Fragment>
              {parts.map((part, index) => {
                const match = part.match(/^\\{(\\d+)\\}$/);
                if (match) {
                  const questionId = match[1];
                  const value = userAnswers[questionId] || \'\';

                  return (
                    <span key={index} className="inline-block mx-2 align-middle">
                      <input
                        id={`gap-input-${questionId}`}
                        type="text"
                        value={value}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder={questionId}
                        className="px-1 py-0 h-[1.3em] text-center border border-gray-400 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors font-semibold text-blue-800 text-[inherit]"
                        style={{ minWidth: '140px', maxWidth: '230px', width: 'auto' }}
                        onFocus={() => { focusedId.current = questionId; }}
                        onBlur={() => { focusedId.current = null; }}
                        onChange={(e) => handleInputChange(questionId, e.target.value)}
                      />
                    </span>
                  );
                }

                if (part.includes(\'\\n\')) {
                  return (
                    <span key={index}>
                      {part.split(\'\\n\').map((line, i, arr) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </span>
                  );
                }
                return <span key={index}>{part}</span>;
              })}
            </React.Fragment>
          );
        }
      }
    }
  };

  const cleanContent = data.content
    ? data.content.replace(/\\[cite[^\\]]*\\]/ig, \'\').replace(/\\n/g, \'<br/>\')
    : \'\';

  return (
    <div className="mb-8 font-sans">
      <div className="space-y-3 leading-loose text-gray-800 ielts-html-content">
        <div className="leading-[1.4] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1 [&_li]:mb-1 [&_li]:mt-0">
          {parse(cleanContent, options)}
        </div>
      </div>
      <style jsx global>{`
        .ielts-html-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #777;
        }
        .ielts-html-content th, .ielts-html-content td {
          border: 1px solid #777;
          padding: 8px 12px;
          text-align: left;
        }
        .ielts-html-content th { background-color: #f7f7f7; }
      `}</style>
    </div>
  );
};

export default GapFill;
```

---

## 3. Match Dropdown (Select ishlatilishi)
Maxsus dizayndagi dropdown (select). Bu odatiy `<select>` emas, balki qulay dizayndagi custom dropdown qilib ishlangan.

```jsx
\'use client\';

import React, { useState, useEffect, useRef } from \'react\';

const MatchDropdown = ({ data, onAnswer, startIndex = 1, layout, userAnswers = {} }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const isStacked = layout === \'stacked\';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener(\'mousedown\', handleClickOutside);
    return () => document.removeEventListener(\'mousedown\', handleClickOutside);
  }, []);

  const handleSelect = (questionId, value) => {
    setOpenDropdown(null);
    onAnswer(questionId, value);
  };

  const toggleDropdown = (questionId) => {
    setOpenDropdown((prev) => (prev === questionId ? null : questionId));
  };

  const renderOptionText = (text) => {
    const match = text.match(/^([A-Z])[.\\s:)]*(.*)$/);
    if (match) {
      return (
        <span>
          <span className="font-bold">{match[1]}</span> {match[2]}
        </span>
      );
    }
    return text;
  };

  const optionLetters = data.options || [];

  return (
    <div className={`mb-8 font-sans ${isStacked ? \'w-full\' : \'w-full lg:w-[60%]\'}`} ref={dropdownRef}>
      {data.instruction && (
        <p className="mb-4" style={{ fontSize: \'1.1em\', color: \'var(--test-fg)\' }}>
          {data.instruction}
        </p>
      )}

      <div className={`flex flex-col ${isStacked ? \'gap-6\' : \'lg:flex-row gap-10\'} items-start mt-6`}>
        {data.optionDescriptions && data.optionDescriptions.length > 0 && (
          <div className={`w-full ${isStacked ? \'\' : \'lg:w-1/2\'} p-6 rounded-md border`} style={{ backgroundColor: \'var(--test-strip-bg)\', borderColor: \'var(--test-border)\', color: \'var(--test-fg)\' }}>
            <h3 className="text-center font-bold mb-5" style={{ color: \'var(--test-fg)\', fontSize: \'1.15em\' }}>
              List of Options
            </h3>
            <div className="space-y-3">
              {data.optionDescriptions.map((desc, idx) => (
                <p key={idx} className="leading-relaxed" style={{ fontSize: \'1.05em\', color: \'var(--test-fg)\' }}>
                  {renderOptionText(desc)}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className={`w-full ${isStacked ? \'\' : \'lg:w-1/2\'} space-y-5`}>
          {data.questions.map((q, qIdx) => {
            const globalNum = startIndex + qIdx;
            const questionId = String(globalNum);
            const selected = userAnswers[questionId];
            const isOpen = openDropdown === questionId;

            return (
              <div key={q.id || questionId} className="flex items-center gap-6 mb-2">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-[2em] h-[2em] border font-bold rounded-md shadow-sm select-none" style={{ fontSize: \'1.1em\', backgroundColor: \'var(--test-header-bg)\', color: \'var(--test-header-fg)\', borderColor: \'var(--test-border)\' }}>
                    {globalNum}
                  </span>
                </div>
                
                <div 
                  className="flex-1 font-medium leading-normal [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2" 
                  style={{ fontSize: \'1.05em\', color: \'var(--test-fg)\' }}
                  dangerouslySetInnerHTML={{ __html: q.text }}
                />

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => toggleDropdown(questionId)}
                    className="flex items-center justify-between min-w-[60px] h-[34px] px-3 border rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ backgroundColor: \'var(--test-input-bg)\', borderColor: \'var(--test-border)\', color: \'var(--test-fg)\' }}
                  >
                    <span className="font-medium leading-none" style={{ fontSize: \'0.95em\' }}>
                      {selected ? selected : globalNum}
                    </span>
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ color: \'var(--test-fg)\' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="absolute right-0 top-full mt-1 w-full min-w-[80px] border rounded-md shadow-lg z-50 py-1" style={{ backgroundColor: \'var(--opts-bg)\', borderColor: \'var(--opts-border)\' }}>
                      {optionLetters.map((opt) => (
                        <div
                          key={opt}
                          onClick={() => handleSelect(questionId, opt)}
                          className={`px-4 py-2 cursor-pointer text-center font-medium transition-colors`}
                          style={{
                            backgroundColor: selected === opt ? \'rgba(239, 68, 68, 0.9)\' : \'transparent\',
                            color: selected === opt ? \'#fff\' : \'var(--opts-fg)\',
                          }}
                          onMouseEnter={(e) => {
                            if (selected !== opt) {
                              e.currentTarget.style.backgroundColor = \'rgba(239, 68, 68, 0.2)\';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selected !== opt) {
                              e.currentTarget.style.backgroundColor = \'transparent\';
                            }
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchDropdown;
```

---

## 4. Checkbox Multiple (Checkboxlik savollar)
Birdan ortiq javob tanlanadigan savollar uchun (masalan "Choose two correct letters"). Maxsus belgilanish effekti bor.

```jsx
\'use client\';

import React from \'react\';

const CheckboxMultiple = ({ data, onAnswer, userAnswers = {} }) => {
  const extractLetter = (optStr) => {
    const match = optStr.match(/^([A-Z])[.\\s:)]/);
    return match ? match[1] : optStr;
  };

  const handleToggle = (qListId, value, maxAllowed, questionNumbers) => {
    const currentSelections = questionNumbers
      .map((num) => userAnswers[String(num)])
      .filter((v) => v && v.trim() !== \'\');

    let nextSelections;
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
      onAnswer(String(num), nextSelections[index] || \'\');
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
            .filter((v) => v && v.trim() !== \'\');

          const isAtLimit = currentSelections.length >= maxAllowed;
          const numbersLabel = questionNumbers.length > 1
            ? `${questionNumbers[0]}–${questionNumbers[questionNumbers.length - 1]}`
            : String(questionNumbers[0]);

          const usePerQuestionOptions = data.hasPerQuestionOptions && q.fullOptions;
          const displayOptions = usePerQuestionOptions ? q.fullOptions : (data.options || []);

          return (
            <div key={qListId}>
              <div style={{ display: \'flex\', gap: 12, alignItems: \'flex-start\', marginBottom: 10 }}>
                <span
                  style={{
                    display: \'inline-flex\', alignItems: \'center\', justifyContent: \'center\',
                    padding: \'2px 8px\', border: \'1.5px solid #222\', borderRadius: 2,
                    fontWeight: 700, fontSize: \'0.98em\', color: \'var(--test-fg, #111)\',
                    whiteSpace: \'nowrap\', flexShrink: 0, minWidth: 36,
                  }}
                >
                  {numbersLabel}
                </span>
                <div
                  style={{ fontSize: \'1em\', fontWeight: 400, lineHeight: 1.55, color: \'var(--test-fg, #111)\' }}
                  dangerouslySetInnerHTML={{ __html: q.text }}
                />
              </div>

              <div style={{ display: \'flex\', flexDirection: \'column\', gap: 0 }}>
                {displayOptions.map((opt, idx) => {
                  const value = usePerQuestionOptions ? extractLetter(opt) : opt;
                  const isChecked = currentSelections.includes(value);
                  const isDisabled = !isChecked && isAtLimit;
                  const labelText = opt.replace(/^[A-Z][.\\s:)]\\s*/, \'\').trim();

                  return (
                    <label
                      key={idx}
                      style={{
                        display: \'flex\', alignItems: \'center\', gap: 12, padding: \'9px 12px\',
                        background: isChecked ? \'#dbeafe\' : \'transparent\',
                        cursor: isDisabled ? \'not-allowed\' : \'pointer\',
                        opacity: isDisabled ? 0.5 : 1, userSelect: \'none\',
                        transition: \'background 0.12s\', borderRadius: 2,
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked && !isDisabled) e.currentTarget.style.background = \'#f0f7ff\';
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked && !isDisabled) e.currentTarget.style.background = \'transparent\';
                      }}
                    >
                      <div style={{ position: \'relative\', width: 18, height: 18, flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && handleToggle(qListId, value, maxAllowed, questionNumbers)}
                          style={{ position: \'absolute\', opacity: 0, width: 0, height: 0 }}
                        />
                        <div
                          style={{
                            width: 18, height: 18, border: isChecked ? \'2px solid #2563eb\' : \'2px solid #9ca3af\',
                            borderRadius: 3, background: isChecked ? \'#2563eb\' : \'white\',
                            display: \'flex\', alignItems: \'center\', justifyContent: \'center\',
                            transition: \'all 0.12s\',
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
                          fontSize: \'1em\', lineHeight: 1.5,
                          color: isChecked ? \'#1e40af\' : isDisabled ? \'#9ca3af\' : \'var(--test-fg, #111)\',
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
```

---

## 5. Bottom Navigator (Testdagi pastki navigator)
Savollarga o\'tish, next/prev tugmalari va submit oynasini o\'z ichiga oladi.

```jsx
\'use client\';

export default function TestNavigator({
  parts = [],
  activePart = 0,
  currentQuestion = null,
  onPartChange,
  answeredIds = [],
  partQuestionRanges = [],
  onSubmit,
  onNext,
  onPrev,
}) {
  if (!parts || parts.length === 0) return null;

  const answeredSet = new Set(answeredIds.map(String));

  const getPartStats = (partIndex) => {
    const range = partQuestionRanges[partIndex];
    if (!range) return { total: 0, answered: 0, questions: [] };

    const questions = [];
    for (let i = range.start; i <= range.end; i++) {
      questions.push(i);
    }

    const answered = questions.filter((q) =>
      answeredSet.has(String(q))
    ).length;

    return { total: questions.length, answered, questions };
  };

  const scrollToQuestion = (qNum) => {
    const el = document.getElementById(`question-${qNum}`);
    if (el) el.scrollIntoView({ behavior: \'smooth\', block: \'center\' });
  };

  return (
    <>
      <div
        className="fixed flex items-center gap-[1px]"
        style={{ bottom: \'calc(56px + 15px)\', right: \'16px\', zIndex: 41 }}
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
          zIndex: 40, background: \'var(--test-nav-bg)\', color: \'var(--test-nav-fg)\',
          borderTop: \'1px solid var(--test-border)\',
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
                style={{ borderRight: \'1px solid var(--test-border)\' }}
              >
                <span className="font-bold text-[13px] whitespace-nowrap mr-3 shrink-0" style={{ color: \'var(--test-nav-fg)\' }}>
                  {label}
                </span>

                <div className="flex items-center gap-[5px] overflow-x-auto ">
                  {stats.questions.map((qNum) => {
                    const isAnswered = answeredSet.has(String(qNum));
                    const isCurrent = currentQuestion === qNum;

                    return (
                      <button
                        key={qNum}
                        onClick={() => scrollToQuestion(qNum)}
                        className={`flex items-center justify-center min-w-[25px] h-[42px] text-[18px] font-semibold shrink-0 outline-none cursor-pointer transition-colors`}
                        style={{
                          border: isCurrent ? \'2px solid #2563eb\' : `1px solid var(--test-border)`,
                          background: isCurrent ? \'var(--test-bg)\' : isAnswered ? \'var(--test-strip-bg)\' : \'var(--test-bg)\',
                          color: isCurrent ? \'#2563eb\' : \'var(--test-fg)\',
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
              onClick={() => onPartChange(idx)}
              className="flex-1 flex items-center justify-center gap-2 transition-colors outline-none cursor-pointer"
              style={{
                borderRight: \'1px solid var(--test-border)\', background: \'var(--test-nav-bg)\',
                color: \'var(--test-nav-fg)\',
              }}
            >
              <span className="font-bold text-[13px] opacity-60 whitespace-nowrap">{label}</span>
              <span className="text-[11px] opacity-40 whitespace-nowrap">{stats.answered} of {stats.total}</span>
            </button>
          );
        })}

        {onSubmit && (
          <div className="flex items-center px-4 shrink-0" style={{ borderLeft: \'1px solid var(--test-border)\' }}>
            <button
              onClick={onSubmit}
              className="flex items-center justify-center w-9 h-9 border transition-colors outline-none"
              style={{
                borderColor: \'var(--test-border)\', background: \'var(--test-nav-bg)\', color: \'var(--test-nav-fg)\',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```
