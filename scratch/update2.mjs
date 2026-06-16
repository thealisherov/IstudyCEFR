import fs from 'fs';

const path = 'c:/cefr/src/app/(student)/test/[testId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update partQuestionRanges
content = content.replace(
  /let currentOffset = 1;\s*return \(activeParts as TestPart\[\]\)\.map\(\(part\) => \{\s*const qCount = part\.questions\.length;\s*const range = \{\s*start: currentOffset,\s*end: currentOffset \+ qCount - 1\s*\};\s*currentOffset \+= qCount;\s*return range;\s*\}\);/g,
  `let currentOffset = 1;
    return (activeParts as TestPart[]).map((part) => {
      let qCount = 0;
      if (part.nestedParts && part.nestedParts.length > 0) {
        qCount = part.nestedParts.reduce((acc, sp) => acc + (sp.questions?.length || 0), 0);
      } else {
        qCount = part.questions?.length || 0;
      }
      const range = {
        start: currentOffset,
        end: currentOffset + qCount - 1
      };
      currentOffset += qCount;
      return range;
    });`
);

// 2. Update reading pane-right
const oldReadingPaneRegex = /<div className="pane-right">\s*<h4 className="text-xl font-bold text-slate-900 mb-4">\{activePart\?\.title\}<\/h4>[\s\S]*?<\/div>\s*<\/div>/m;

const newReadingPane = `<div className="pane-right">
              <h4 className="text-xl font-bold text-slate-900 mb-4">{activePart?.title}</h4>
              
              {(activePart as TestPart)?.nestedParts && (activePart as TestPart).nestedParts!.length > 0 ? (
                (activePart as TestPart).nestedParts!.map((subPart, spIdx) => {
                  let subStart = partQuestionRanges[store.currentPartIndex]?.start || 1;
                  for(let i=0; i<spIdx; i++) {
                    subStart += (activePart as TestPart).nestedParts![i].questions?.length || 0;
                  }
                  return (
                    <div key={subPart.id} className="mb-12">
                      {subPart.title && subPart.title !== 'Questions' && <h5 className="font-bold text-lg mb-2">{subPart.title}</h5>}
                      {subPart.instruction && <p className="text-sm font-semibold text-slate-700 mb-4">{subPart.instruction}</p>}
                      
                      {subPart.type === 'tf_ng' || subPart.type === 'yn_ng' || subPart.type === 'mc_one' || subPart.type === 'multiple_choice' ? (
                        <TrueFalse data={subPart as any} onAnswer={handleAnswerSubmit} startIndex={subStart} userAnswers={store.answers} />
                      ) : subPart.type === 'mc_multi' || subPart.type === 'abc_checkbox' ? (
                        <CheckboxMultiple data={subPart as any} onAnswer={handleAnswerSubmit} userAnswers={store.answers} />
                      ) : subPart.type === 'gap_fill' || subPart.type === 'summary_comp' || subPart.type === 'gap_fill_missing' || subPart.type === 'gap_input' ? (
                        <GapFill data={subPart as any} onAnswer={handleAnswerSubmit} userAnswers={store.answers} />
                      ) : subPart.type === 'match_info' || subPart.type === 'match_features' || subPart.type === 'match_headings' || subPart.type === 'map_labeling' || subPart.type === 'matching' ? (
                        <MatchDropdown data={subPart as any} onAnswer={handleAnswerSubmit} startIndex={subStart} userAnswers={store.answers} />
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <>
                  {activePart?.type === 'tf_ng' || activePart?.type === 'yn_ng' || activePart?.type === 'mc_one' || activePart?.type === 'multiple_choice' ? (
                    <TrueFalse data={activePart as any} onAnswer={handleAnswerSubmit} startIndex={partQuestionRanges[store.currentPartIndex]?.start} userAnswers={store.answers} />
                  ) : activePart?.type === 'mc_multi' || activePart?.type === 'abc_checkbox' ? (
                    <CheckboxMultiple data={activePart as any} onAnswer={handleAnswerSubmit} userAnswers={store.answers} />
                  ) : activePart?.type === 'gap_fill' || activePart?.type === 'summary_comp' || activePart?.type === 'gap_fill_missing' || activePart?.type === 'gap_input' ? (
                    <GapFill data={activePart as any} onAnswer={handleAnswerSubmit} userAnswers={store.answers} />
                  ) : activePart?.type === 'match_info' || activePart?.type === 'match_features' || activePart?.type === 'match_headings' || activePart?.type === 'map_labeling' || activePart?.type === 'matching' ? (
                    <MatchDropdown data={activePart as any} onAnswer={handleAnswerSubmit} startIndex={partQuestionRanges[store.currentPartIndex]?.start} userAnswers={store.answers} />
                  ) : null}
                </>
              )}
            </div>
          </div>`;

content = content.replace(oldReadingPaneRegex, newReadingPane);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
