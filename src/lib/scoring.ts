// CEFR scoring mapping from the provided chart
// Maps correct answer count (1-35) to CEFR score (out of 75)

const LISTENING_SCORE_MAP: Record<number, number> = {
  0: 0,
  1: 23,
  2: 26,
  3: 28,
  4: 30,
  5: 33,
  6: 34,
  7: 36,
  8: 38,
  9: 39,
  10: 41,
  11: 42,
  12: 44,
  13: 45,
  14: 47,
  15: 48,
  16: 50,
  17: 51,
  18: 53,
  19: 54,
  20: 55,
  21: 57,
  22: 58,
  23: 60,
  24: 61,
  25: 63,
  26: 65,
  27: 66,
  28: 68,
  29: 70,
  30: 72,
  31: 73,
  32: 74,
  33: 75,
  34: 75,
  35: 75,
};

const READING_SCORE_MAP: Record<number, number> = {
  0: 0,
  1: 20,
  2: 24,
  3: 27,
  4: 29,
  5: 32,
  6: 34,
  7: 36,
  8: 38,
  9: 39,
  10: 41,
  11: 42,
  12: 44,
  13: 45,
  14: 46,
  15: 48,
  16: 49,
  17: 51,
  18: 52,
  19: 54,
  20: 55,
  21: 57,
  22: 58,
  23: 60,
  24: 61,
  25: 63,
  26: 65,
  27: 66,
  28: 68,
  29: 70,
  30: 71,
  31: 73,
  32: 74,
  33: 75,
  34: 75,
  35: 75,
};

export function getListeningCEFRScore(correctAnswersCount: number): number {
  const count = Math.max(0, Math.min(35, Math.round(correctAnswersCount)));
  return LISTENING_SCORE_MAP[count] || 0;
}

export function getReadingCEFRScore(correctAnswersCount: number): number {
  const count = Math.max(0, Math.min(35, Math.round(correctAnswersCount)));
  return READING_SCORE_MAP[count] || 0;
}

export function normalizeAnswer(answer?: string): string {
  if (!answer) return '';
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface SectionScore {
  correct: number;
  total: number;
  cefrScore: number;
}

export function calculateSectionScore(
  answers: Record<string, string>,
  correctAnswers: Record<string, { answer: string, alternativeAnswers?: string[] }>,
  type: 'listening' | 'reading'
): SectionScore {
  let correct = 0;
  const total = Object.keys(correctAnswers).length;

  Object.entries(correctAnswers).forEach(([qNum, correctObj]) => {
    const userVal = normalizeAnswer(answers[qNum]);
    const mainVal = normalizeAnswer(correctObj.answer);
    
    if (userVal === mainVal && mainVal !== '') {
      correct++;
    } else if (correctObj.alternativeAnswers && correctObj.alternativeAnswers.length > 0) {
      const isAltCorrect = correctObj.alternativeAnswers.some(
        alt => normalizeAnswer(alt) === userVal && normalizeAnswer(alt) !== ''
      );
      if (isAltCorrect) {
        correct++;
      }
    }
  });

  const cefrScore = type === 'listening' 
    ? getListeningCEFRScore(correct) 
    : getReadingCEFRScore(correct);

  return { correct, total, cefrScore };
}
