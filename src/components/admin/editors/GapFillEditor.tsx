import React from 'react';
import { TestPart, Question } from '@/types/test';
import { X } from 'lucide-react';

interface GapFillEditorProps {
  part: TestPart;
  startQuestionNumber: number;
  onUpdate: (part: TestPart) => void;
}

export default function GapFillEditor({ part, startQuestionNumber, onUpdate }: GapFillEditorProps) {
  const handleChange = (field: keyof TestPart, value: any) => {
    onUpdate({ ...part, [field]: value });
  };

  const handleQuestionChange = (qIdx: number, field: keyof Question, value: any) => {
    const updatedQs = [...part.questions];
    updatedQs[qIdx] = { ...updatedQs[qIdx], [field]: value };
    onUpdate({ ...part, questions: updatedQs });
  };

  const handleGapFillChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    
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

  return (
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
}
