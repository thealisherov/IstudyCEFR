import fs from 'fs';

const path = 'c:/cefr/src/components/admin/TestPartEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update TestPartEditorProps
content = content.replace(
  "section: 'listening' | 'reading';",
  "section: 'listening' | 'reading' | 'reading_sub';"
);

// 2. Add the three new editors before `return (`
const newEditors = `
  const renderStandardMultipleChoiceEditor = () => (
    <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="flex justify-between items-center">
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Multiple Choice Questions:</h5>
        <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">+ Add Question</button>
      </div>
      
      {part.questions.map((q, qIdx) => (
        <div key={q.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800 dark:text-slate-200">Q{q.questionNumber}</span>
            <button onClick={() => removeQuestion(qIdx)} className="text-red-400 text-xs">Remove</button>
          </div>
          
          <input
            type="text"
            value={q.text}
            onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
            placeholder="Question text..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
          />
          
          <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
             {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
               const currentOpt = q.fullOptions?.[optIdx] || \`\${letter}. \`;
               return (
                 <div key={letter} className="flex gap-2 items-center">
                   <input 
                     type="radio" 
                     name={\`mc-\${q.id}\`} 
                     checked={q.answer === letter} 
                     onChange={() => handleQuestionChange(qIdx, 'answer', letter)}
                     className="w-4 h-4 cursor-pointer"
                   />
                   <input
                     type="text"
                     value={currentOpt}
                     onChange={(e) => {
                       const newOpts = [...(q.fullOptions || ['A. ', 'B. ', 'C. ', 'D. '])];
                       newOpts[optIdx] = e.target.value;
                       handleQuestionChange(qIdx, 'fullOptions', newOpts);
                       if (!part.hasPerQuestionOptions) handleChange('hasPerQuestionOptions', true);
                     }}
                     className="flex-1 px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-sm"
                   />
                 </div>
               )
             })}
          </div>
        </div>
      ))}
    </div>
  );

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
           <button onClick={() => handleChange('passageText', (part.passageText || '') + '<b></b>')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">B</button>
           <button onClick={() => handleChange('passageText', (part.passageText || '') + '<i></i>')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs italic hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">I</button>
           <button onClick={() => handleChange('passageText', (part.passageText || '') + '<br/>\\n')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">New Line (br)</button>
           <button onClick={() => handleChange('passageText', (part.passageText || '') + '<p></p>\\n')} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">Paragraph (p)</button>
        </div>
        <textarea
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
               const newSub: TestPart = {
                 id: \`sub-\${Date.now()}\`,
                 type: 'gap_fill',
                 title: \`Questions\`,
                 questions: []
               };
               handleChange('nestedParts', [...(part.nestedParts || []), newSub]);
            }}
            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
          >
            + Add Question Block
          </button>
        </div>
        
        {part.nestedParts?.map((subPart, spIdx) => (
          <div key={subPart.id} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600 my-4">
             <TestPartEditor
                part={subPart}
                partIndex={spIdx}
                section="reading_sub"
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
        ))}
      </div>
    </div>
  );

  return (
`;

content = content.replace('  return (', newEditors);


// 3. Update the return block
const newReturn = `
  return (
    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 relative">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase">Part #{partIndex + 1} {section === 'reading_sub' ? '(Question Block)' : \`- \${section}\`}</span>
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
              <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
              <option value="mc_one">Standard Multiple Choice (A/B/C/D)</option>
              <option value="gap_fill_missing">Missing Information (Gap Fill)</option>
              <option value="gap_fill">Summary Completion (Gap Fill)</option>
              <option value="match_info">Match Information</option>
              <option value="map_labeling">Map/Plan Labeling</option>
              <option value="tf_ng">True / False / No Information</option>
              <option value="yn_ng">Yes / No / No Information</option>
            </select>
          </div>
        )}
      </div>

      {section === 'listening' && (
        <FileUploader
          value={part.audioUrl || ''}
          onUpload={(url) => handleChange('audioUrl', url)}
          folder="audio"
          accept="audio/*"
          label="Audio Track (Yuklang yoki URL kiriting)"
        />
      )}

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
      {part.type === 'gap_fill_missing' || part.type === 'gap_fill' || part.type === 'summary_comp' ? renderGapFillEditor() : null}
      {part.type === 'match_info' || part.type === 'matching' ? renderMatchInfoEditor() : null}
      {part.type === 'map_labeling' ? renderMapLabelingEditor() : null}
      {part.type === 'multiple_choice' || part.type === 'mc_multi' || part.type === 'abc_checkbox' ? renderMultipleChoiceMultiEditor() : null}
      {part.type === 'mc_one' ? renderStandardMultipleChoiceEditor() : null}
      {part.type === 'tf_ng' || part.type === 'yn_ng' ? renderTrueFalseEditor() : null}
      
    </div>
  );
}
`;

content = content.replace(/  return \([\s\S]*\}\;/m, newReturn);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
