'use client';

import React, { useRef } from 'react';
import { TestPart, QuestionType, Question } from '@/types/test';
import { Trash2, Plus, GripVertical, X } from 'lucide-react';
import FileUploader from './FileUploader';

interface TestPartEditorProps {
  part: TestPart;
  partIndex: number;
  section: 'listening' | 'reading' | 'reading_sub';
  startQuestionNumber?: number;
  onUpdate: (part: TestPart) => void;
  onDelete: () => void;
}

export default function TestPartEditor({
  part,
  partIndex,
  section,
  startQuestionNumber = 1,
  onUpdate,
  onDelete,
}: TestPartEditorProps) {

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTagAtCursor = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = openTag + selectedText + closeTag;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    handleChange('passageText', newContent);

    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + openTag.length;
      const selectionEnd = selectionStart + selectedText.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  const handleChange = (field: keyof TestPart, value: any) => {
    onUpdate({ ...part, [field]: value });
  };

  const handleQuestionChange = (qIdx: number, field: keyof Question, value: any) => {
    const updatedQs = [...part.questions];
    updatedQs[qIdx] = { ...updatedQs[qIdx], [field]: value };
    onUpdate({ ...part, questions: updatedQs });
  };

  const addQuestion = () => {
    const startNum = startQuestionNumber;
    const qNum = part.questions.length > 0 
      ? part.questions[part.questions.length - 1].questionNumber + 1 
      : startNum;
    onUpdate({
      ...part,
      questions: [
        ...part.questions,
        { 
          id: `q-${Date.now()}`, 
          questionNumber: qNum, 
          text: '', 
          answer: '',
          fullOptions: part.type === 'multiple_choice' ? ['A. ', 'B. ', 'C. '] : undefined
        }
      ]
    });
  };

  const removeQuestion = (qIdx: number) => {
    const updatedQs = part.questions.filter((_, i) => i !== qIdx);
    onUpdate({ ...part, questions: updatedQs });
  };

  const handleGapFillChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    handleChange('content', content);
    
    // Automatically manage questions based on (BLANK) count
    const blankCount = (content.match(/\(BLANK\)/g) || []).length;
    const startNum = startQuestionNumber;
    let newQs = [...part.questions];
    
    if (newQs.length < blankCount) {
      // Add missing questions
      const currentLen = newQs.length;
      for (let i = currentLen; i < blankCount; i++) {
        newQs.push({
          id: `q-${Date.now()}-${i}`,
          questionNumber: startNum + i,
          text: `Blank ${i + 1}`,
          answer: '',
          alternativeAnswers: []
        });
      }
    } else if (newQs.length > blankCount) {
      // Remove extra questions
      newQs = newQs.slice(0, blankCount);
    }
    
    // Re-index all question numbers to match startNum + index
    newQs = newQs.map((q, idx) => ({
      ...q,
      questionNumber: startNum + idx
    }));
    
    onUpdate({ ...part, content, questions: newQs });
  };

  const renderGapFillEditor = () => (
    <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note/Form Template:</label>
        <button
          type="button"
          onClick={() => {
            const textarea = document.getElementById(`content-${part.id}`) as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const val = textarea.value;
              const newVal = val.substring(0, start) + '(BLANK)' + val.substring(end);
              handleChange('content', newVal);
              
              const e = { target: { value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
              handleGapFillChange(e);

              setTimeout(() => {
                textarea.focus();
                const newPos = start + '(BLANK)'.length;
                textarea.setSelectionRange(newPos, newPos);
              }, 0);
            }
          }}
          className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          (BLANK) qo'shish
        </button>
      </div>
      <textarea
        id={`content-${part.id}`}
        value={part.content || ''}
        onChange={handleGapFillChange}
        placeholder="Enter the full text/notes... Use (BLANK) for each missing word."
        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition h-32 font-mono"
      />

      <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Answers for blanks:</h5>
        {part.questions.map((q, qIdx) => (
          <div key={q.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex gap-3 items-start">
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-2 min-w-[30px]">Q{q.questionNumber}:</span>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={q.answer || ''}
                onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                placeholder="Correct answer"
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-sm text-slate-900 dark:text-white"
                style={{ minWidth: '130px', maxWidth: '250px', width: '100%' }}
              />
              <div className="space-y-1">
                {q.alternativeAnswers?.map((alt, altIdx) => (
                  <div key={altIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={alt}
                      onChange={(e) => {
                        const newAlts = [...(q.alternativeAnswers || [])];
                        newAlts[altIdx] = e.target.value;
                        handleQuestionChange(qIdx, 'alternativeAnswers', newAlts);
                      }}
                      placeholder="Alternative answer"
                      className="px-3 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-600 dark:text-slate-300"
                      style={{ minWidth: '130px', maxWidth: '250px', width: '100%' }}
                    />
                    <button
                      onClick={() => {
                        const newAlts = [...(q.alternativeAnswers || [])];
                        newAlts.splice(altIdx, 1);
                        handleQuestionChange(qIdx, 'alternativeAnswers', newAlts);
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    handleQuestionChange(qIdx, 'alternativeAnswers', [...(q.alternativeAnswers || []), '']);
                  }}
                  className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-bold uppercase"
                >
                  + Add Alternative
                </button>
              </div>
            </div>
          </div>
        ))}
        {part.questions.length === 0 && <p className="text-xs text-slate-500">Matn ichida (BLANK) qo'shing.</p>}
      </div>
    </div>
  );

  const renderMatchInfoEditor = () => (
    <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Information Statements:</h5>
            <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">+ Add Statement</button>
          </div>
          {part.questions.map((q, qIdx) => (
            <div key={q.id} className="relative">
              <textarea
                value={q.text}
                onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                placeholder={`Q${q.questionNumber} statement...`}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
              />
              <button onClick={() => removeQuestion(qIdx)} className="absolute top-2 right-2 text-red-400 text-xs">Remove</button>
            </div>
          ))}
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Paragraph Labels:</h5>
            <button
              onClick={() => handleChange('options', [...(part.options || []), `Label ${(part.options?.length || 0) + 1}`])}
              className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold"
            >
              + Add Label
            </button>
          </div>
          {part.options?.map((opt, optIdx) => (
            <div key={optIdx} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(part.options || [])];
                  newOpts[optIdx] = e.target.value;
                  handleChange('options', newOpts);
                }}
                className="flex-1 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  const newOpts = [...(part.options || [])];
                  newOpts.splice(optIdx, 1);
                  handleChange('options', newOpts);
                }}
                className="text-red-400 text-xs px-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/20 mt-4 space-y-3">
        <h5 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Correct Answers:</h5>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {part.questions.map((q, qIdx) => (
            <div key={q.id} className="flex items-center gap-2 min-w-[220px] max-w-[320px] flex-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Q{q.questionNumber}:</span>
              <select
                value={q.answer || ''}
                onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-slate-900 dark:text-slate-100"
              >
                <option value="">Select Option</option>
                {part.options?.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMapLabelingEditor = () => (
    <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
      <FileUploader
        value={part.imageUrl || ''}
        onUpload={(url) => handleChange('imageUrl', url)}
        folder="images"
        accept="image/*"
        label="Upload Map/Plan Image:"
        placeholder="https://example.com/map.jpg"
      />
      
      <div className="space-y-3">
        <div className="flex justify-between items-center mt-4">
          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Map Options (A, B, C...):</h5>
          <button
            onClick={() => {
              const currentLetter = String.fromCharCode(65 + (part.options?.length || 0)); // A, B, C...
              handleChange('options', [...(part.options || []), currentLetter]);
            }}
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-[10px] font-bold"
          >
            + Add Option
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {part.options?.map((opt, optIdx) => (
            <div key={optIdx} className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(part.options || [])];
                  newOpts[optIdx] = e.target.value;
                  handleChange('options', newOpts);
                }}
                className="bg-transparent text-center focus:outline-none font-bold"
                style={{ minWidth: '130px', maxWidth: '250px', width: '100%' }}
              />
              <button
                onClick={() => {
                  const newOpts = [...(part.options || [])];
                  newOpts.splice(optIdx, 1);
                  handleChange('options', newOpts);
                }}
                className="text-red-400 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {!part.options?.length && <span className="text-xs text-slate-500">No options added yet.</span>}
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex justify-between items-center">
          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Locations (Questions):</h5>
          <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">+ Add Location</button>
        </div>
        
        <div className="space-y-2">
          {part.questions.map((q, qIdx) => (
            <div key={q.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200 min-w-[30px]">Q{q.questionNumber}</span>
              <div className="flex-1 w-full">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase">Location Name</label>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                  placeholder="e.g., '1 Quilt Shop', 'Library'"
                  className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded text-sm"
                />
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase">Correct Answer</label>
                <select
                  value={q.answer || ''}
                  onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded text-sm"
                >
                  <option value="">Select option...</option>
                  {part.options?.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => removeQuestion(qIdx)} className="text-red-400 text-xs mt-4 md:mt-0">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMultipleChoiceEditor = () => {
    const count = part.answerCount || 1;
    const isSingle = count <= 1;

    return (
      <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex items-center gap-4">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Select Answers:</label>
          <select
            value={count}
            onChange={(e) => handleChange('answerCount', Number(e.target.value))}
            className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} answer{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        {isSingle ? (
          /* ── Single answer: per-question with radio buttons ── */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Questions:</h5>
              <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">+ Add Question</button>
            </div>

            {part.questions.map((q, qIdx) => {
              const optionsList = q.fullOptions || ['A. ', 'B. ', 'C. '];
              return (
                <div key={q.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Q{q.questionNumber}</span>
                    <button onClick={() => removeQuestion(qIdx)} className="text-red-400 text-xs font-bold hover:underline">Remove</button>
                  </div>

                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                    placeholder="Question text..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  />

                  <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Options:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextLetter = String.fromCharCode(65 + optionsList.length);
                          const newOpts = [...optionsList, `${nextLetter}. `];
                          handleQuestionChange(qIdx, 'fullOptions', newOpts);
                          if (!part.hasPerQuestionOptions) handleChange('hasPerQuestionOptions', true);
                        }}
                        className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold"
                      >
                        + Add Option
                      </button>
                    </div>

                    {optionsList.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div key={optIdx} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            name={`mc-${q.id}`}
                            checked={q.answer === letter}
                            onChange={() => handleQuestionChange(qIdx, 'answer', letter)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...optionsList];
                              newOpts[optIdx] = e.target.value;
                              handleQuestionChange(qIdx, 'fullOptions', newOpts);
                              if (!part.hasPerQuestionOptions) handleChange('hasPerQuestionOptions', true);
                            }}
                            className="flex-1 px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-sm"
                            style={{ minWidth: '240px', maxWidth: '500px', width: '100%' }}
                          />
                          {optionsList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = [...optionsList];
                                newOpts.splice(optIdx, 1);
                                const reindexedOpts = newOpts.map((o, idx) => {
                                  const curLetter = String.fromCharCode(65 + idx);
                                  const oldLetter = String.fromCharCode(65 + (idx >= optIdx ? idx + 1 : idx));
                                  if (o.trim().startsWith(`${oldLetter}.`) || o.trim() === oldLetter || o.startsWith(`${oldLetter}. `)) {
                                    return o.replace(new RegExp(`^\\s*${oldLetter}\\.\\s*`), `${curLetter}. `);
                                  }
                                  return o;
                                });
                                handleQuestionChange(qIdx, 'fullOptions', reindexedOpts);
                                if (!part.hasPerQuestionOptions) handleChange('hasPerQuestionOptions', true);
                                if (q.answer === letter) {
                                  handleQuestionChange(qIdx, 'answer', '');
                                } else if (q.answer && q.answer.charCodeAt(0) > letter.charCodeAt(0)) {
                                  const prevCode = q.answer.charCodeAt(0);
                                  handleQuestionChange(qIdx, 'answer', String.fromCharCode(prevCode - 1));
                                }
                              }}
                              className="text-red-400 hover:text-red-500 transition p-0.5"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Multiple answers: shared options with checkbox selection ── */
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Question Content:</label>
              <textarea
                value={part.questions[0]?.text || ''}
                onChange={(e) => {
                  if (part.questions.length === 0) {
                    addQuestion();
                  } else {
                    handleQuestionChange(0, 'text', e.target.value);
                  }
                }}
                placeholder="Enter question text..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm min-h-[80px]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Options:</label>
                <button
                  onClick={() => handleChange('options', [...(part.options || []), `Option ${(part.options?.length || 0) + 1}`])}
                  className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold"
                >
                  + Add Option
                </button>
              </div>

              {part.options?.map((opt, optIdx) => (
                <div key={optIdx} className="flex gap-3 items-center">
                  <span className="font-bold text-slate-500 w-6">{String.fromCharCode(65 + optIdx)}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...(part.options || [])];
                      newOpts[optIdx] = e.target.value;
                      handleChange('options', newOpts);
                    }}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                    style={{ minWidth: '260px', maxWidth: '500px', width: '100%' }}
                  />
                  <button
                    onClick={() => {
                      const newOpts = [...(part.options || [])];
                      newOpts.splice(optIdx, 1);
                      handleChange('options', newOpts);
                    }}
                    className="text-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Correct Answers (Select {count}):</h5>
              <div className="flex flex-wrap gap-4">
                {part.options?.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isChecked = part.questions[0]?.alternativeAnswers?.includes(letter);
                  return (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!isChecked}
                        onChange={() => {
                          const newQs = [...part.questions];
                          if (newQs.length > 0) {
                            const alts = [...(newQs[0].alternativeAnswers || [])];
                            if (isChecked) {
                              const idx = alts.indexOf(letter);
                              if (idx > -1) alts.splice(idx, 1);
                            } else {
                              alts.push(letter);
                            }
                            newQs[0] = { ...newQs[0], alternativeAnswers: alts };
                            handleChange('questions', newQs);
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold">{letter}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTrueFalseEditor = () => {
    const opts = part.options && part.options.length === 3 ? part.options : ['TRUE', 'FALSE', 'NO INFORMATION'];
    return (
      <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex justify-between items-center">
          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Statements:</h5>
          <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">+ Add Statement</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center mb-2">
           <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Options:</span>
           {[0, 1, 2].map(i => (
             <input key={i} type="text" value={opts[i]} onChange={(e) => {
                const newOpts = [...opts];
                newOpts[i] = e.target.value;
                handleChange('options', newOpts);
             }} className="w-24 px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded" />
           ))}
        </div>
        
        <div className="space-y-2">
          {part.questions.map((q, qIdx) => (
            <div key={q.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 min-w-[30px]">Q{q.questionNumber}</span>
              <textarea
                value={q.text}
                onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                placeholder="Statement..."
                className="flex-1 w-full px-2 py-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded text-sm"
              />
              <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <select
                  value={q.answer || ''}
                  onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                  className="w-full md:w-32 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold"
                >
                  <option value="">Select...</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-500"><X size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMixedEditor = () => (
    <div className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Passage Text (Paragraphs)</h4>
        <div className="flex gap-2 mb-2">
           <button onClick={() => insertTagAtCursor('<b>', '</b>')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">B</button>
           <button onClick={() => insertTagAtCursor('<i>', '</i>')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs italic hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">I</button>
           <button onClick={() => insertTagAtCursor('<br/>\n', '')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">New Line (br)</button>
           <button onClick={() => insertTagAtCursor('<p>', '</p>\n')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">Paragraph (p)</button>
        </div>
        <textarea
          ref={textareaRef}
          value={part.passageText || ''}
          onChange={(e) => handleChange('passageText', e.target.value)}
          placeholder="Paste IELTS reading passage here... Use HTML tags for formatting."
          className="w-full px-3 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm min-h-[250px] font-serif leading-relaxed focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Question Blocks ({part.nestedParts?.length || 0})</h4>
          <button
            onClick={() => {
               const newSub = {
                 id: `sub-${Date.now()}`,
                 type: 'gap_fill' as QuestionType,
                 title: 'Questions',
                 questions: []
               };
               handleChange('nestedParts', [...(part.nestedParts || []), newSub]);
            }}
            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
          >
            + Add Question Block
          </button>
        </div>
        
        {(() => {
          let nestedOffset = startQuestionNumber;
          return part.nestedParts?.map((subPart, spIdx) => {
             const currentStart = nestedOffset;
             nestedOffset += subPart.questions?.length || 0;
             return (
               <div key={subPart.id} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600 my-4">
                  <TestPartEditor
                     part={subPart}
                     partIndex={spIdx}
                     section="reading_sub"
                     startQuestionNumber={currentStart}
                     onUpdate={(updated) => {
                        const newNested = [...(part.nestedParts || [])];
                        newNested[spIdx] = updated;
                        handleChange('nestedParts', newNested);
                     }}
                     onDelete={() => {
                        const newNested = [...(part.nestedParts || [])];
                        newNested.splice(spIdx, 1);
                        handleChange('nestedParts', newNested);
                     }}
                  />
               </div>
             );
          });
        })()}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 relative">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase">Part #{partIndex + 1} {section === 'reading_sub' ? '(Question Block)' : `- ${section}`}</span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Sarlavha (Title)</label>
          <input
            type="text"
            value={part.type === 'mixed' ? (part.passageTitle || part.title) : part.title}
            onChange={(e) => {
              handleChange('title', e.target.value);
              if (part.type === 'mixed') handleChange('passageTitle', e.target.value);
            }}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        {part.type !== 'mixed' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Question Type</label>
            <select
              value={part.type}
              onChange={(e) => handleChange('type', e.target.value as QuestionType)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition font-bold"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="gap_fill">Gap Fill</option>
              <option value="match_info">Match Information</option>
              <option value="map_labeling">Map/Plan Labeling</option>
              <option value="tf_ng">True / False / No Information</option>
              <option value="yn_ng">Yes / No / Not Given</option>
            </select>
          </div>
        )}
      </div>



      {part.type !== 'mixed' && (
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Ko'rsatma (Instruction)</label>
          <input
            type="text"
            value={part.instruction || ''}
            onChange={(e) => handleChange('instruction', e.target.value)}
            placeholder="e.g. Complete the notes below. Write NO MORE THAN ONE WORD."
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      )}

      {/* Render specific editor based on type */}
      {part.type === 'mixed' ? renderMixedEditor() : null}
      {part.type === 'gap_fill' || part.type === 'gap_fill_missing' || part.type === 'summary_comp' || part.type === 'gap_input' ? renderGapFillEditor() : null}
      {part.type === 'match_info' || part.type === 'matching' || part.type === 'match_features' || part.type === 'match_headings' ? renderMatchInfoEditor() : null}
      {part.type === 'map_labeling' ? renderMapLabelingEditor() : null}
      {part.type === 'multiple_choice' || part.type === 'mc_one' || part.type === 'mc_multi' || part.type === 'abc_checkbox' ? renderMultipleChoiceEditor() : null}
      {part.type === 'tf_ng' || part.type === 'yn_ng' ? renderTrueFalseEditor() : null}
      
    </div>
  );
}
