'use client';

import React, { useRef } from 'react';
import { TestPart, QuestionType, Question } from '@/types/test';
import { Trash2, Plus, GripVertical, X } from 'lucide-react';
import FileUploader from './FileUploader';
import GapFillEditor from './editors/GapFillEditor';
import MatchInfoEditor from './editors/MatchInfoEditor';
import MapLabelingEditor from './editors/MapLabelingEditor';
import MultipleChoiceEditor from './editors/MultipleChoiceEditor';
import TrueFalseEditor from './editors/TrueFalseEditor';
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
      {part.type === 'gap_fill' && <GapFillEditor part={part} startQuestionNumber={startQuestionNumber} onUpdate={onUpdate} />}
      {part.type === 'match_info' && <MatchInfoEditor part={part} startQuestionNumber={startQuestionNumber} onUpdate={onUpdate} />}
      {part.type === 'map_labeling' && <MapLabelingEditor part={part} startQuestionNumber={startQuestionNumber} onUpdate={onUpdate} />}
      {part.type === 'multiple_choice' && <MultipleChoiceEditor part={part} startQuestionNumber={startQuestionNumber} onUpdate={onUpdate} />}
      {(part.type === 'tf_ng' || part.type === 'yn_ng') && <TrueFalseEditor part={part} startQuestionNumber={startQuestionNumber} onUpdate={onUpdate} />}
      {part.type === 'mixed' && renderMixedEditor()}
      
    </div>
  );
}
