import React from 'react';
import { TestPart, Question } from '@/types/test';
import { X } from 'lucide-react';
import FileUploader from '../FileUploader';

interface MapLabelingEditorProps {
  part: TestPart;
  startQuestionNumber: number;
  onUpdate: (part: TestPart) => void;
}

export default function MapLabelingEditor({ part, startQuestionNumber, onUpdate }: MapLabelingEditorProps) {
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
}
