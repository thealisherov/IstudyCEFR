import React from 'react';
import { TestPart, Question } from '@/types/test';

interface MatchInfoEditorProps {
  part: TestPart;
  startQuestionNumber: number;
  onUpdate: (part: TestPart) => void;
}

export default function MatchInfoEditor({ part, startQuestionNumber, onUpdate }: MatchInfoEditorProps) {
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
          answer: ''
        }
      ]
    });
  };

  const removeQuestion = (qIdx: number) => {
    const updatedQs = part.questions.filter((_, i) => i !== qIdx);
    onUpdate({ ...part, questions: updatedQs });
  };

  return (
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
}
