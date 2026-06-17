import React from 'react';
import { TestPart, Question } from '@/types/test';
import { X } from 'lucide-react';

interface TrueFalseEditorProps {
  part: TestPart;
  startQuestionNumber: number;
  onUpdate: (part: TestPart) => void;
}

export default function TrueFalseEditor({ part, startQuestionNumber, onUpdate }: TrueFalseEditorProps) {
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
}
