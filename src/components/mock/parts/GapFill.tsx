'use client';

import React, { useRef, useLayoutEffect } from 'react';
import parse, { DOMNode, Element, Text } from 'html-react-parser';

interface GapFillProps {
  data: {
    id: string;
    content: string;
    questions?: Array<{
      id: string;
      questionNumber: number;
    }>;
  };
  onAnswer: (questionId: string, value: string) => void;
  userAnswers?: Record<string, string>;
}

const GapFill: React.FC<GapFillProps> = ({ data, onAnswer, userAnswers = {} }) => {
  const focusedId = useRef<string | null>(null);

  const handleInputChange = (questionId: string, val: string) => {
    focusedId.current = questionId;
    onAnswer(questionId, val);
  };

  useLayoutEffect(() => {
    if (focusedId.current) {
      const el = document.getElementById(`gap-input-${focusedId.current}`) as HTMLInputElement | null;
      if (el && document.activeElement !== el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  });

  const options = {
    replace: (domNode: DOMNode) => {
      if (domNode.type === 'text') {
        const textNode = domNode as Text;
        const text = textNode.data;
        if (/\{\d+\}/.test(text)) {
          const parts = text.split(/(\{\d+\})/g);
          return (
            <React.Fragment>
              {parts.map((part, index) => {
                const match = part.match(/^\{(\d+)\}$/);
                if (match) {
                  const questionId = match[1];
                  const value = userAnswers[questionId] || '';

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
                        className="px-2 py-0 h-[1.3em] text-center border border-gray-400 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-[width] duration-150 font-semibold text-blue-800 text-[inherit]"
                        style={{ width: `${Math.max(8, value.length + 2)}ch` }}
                        onFocus={() => { focusedId.current = questionId; }}
                        onBlur={() => { focusedId.current = null; }}
                        onChange={(e) => handleInputChange(questionId, e.target.value)}
                      />
                    </span>
                  );
                }

                if (part.includes('\n')) {
                  return (
                    <span key={index}>
                      {part.split('\n').map((line, i, arr) => (
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

  let blankIndex = 0;
  const tempContent = data.content || '';
  const contentWithPlaceholders = tempContent.replace(/\(BLANK\)/g, () => {
    const q = data.questions?.[blankIndex++];
    return q ? `{${q.questionNumber}}` : '(BLANK)';
  });

  const cleanContent = contentWithPlaceholders
    ? contentWithPlaceholders.replace(/\[cite[^\]]*\]/ig, '').replace(/\n/g, '<br/>')
    : '';

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
