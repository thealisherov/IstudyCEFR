import React from 'react';
import { TestPart, Question } from '@/types/test';
import { X } from 'lucide-react';

interface MultipleChoiceEditorProps {
  part: TestPart;
  startQuestionNumber: number;
  onUpdate: (part: TestPart) => void;
}

export default function MultipleChoiceEditor({ part, startQuestionNumber, onUpdate }: MultipleChoiceEditorProps) {
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
          fullOptions: ['A. ', 'B. ', 'C. ']
        }
      ]
    });
  };

  const removeQuestion = (qIdx: number) => {
    const updatedQs = part.questions.filter((_, i) => i !== qIdx);
    onUpdate({ ...part, questions: updatedQs });
  };

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
}
