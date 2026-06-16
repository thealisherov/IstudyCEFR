export type SectionType = 'listening' | 'reading' | 'writing';

export type QuestionType =
  // Reading Types
  | 'match_info'
  | 'match_features'
  | 'match_headings'
  | 'mc_one'
  | 'mc_multi'
  | 'tf_ng'
  | 'yn_ng'
  | 'gap_fill'
  | 'summary_comp'
  | 'mixed' // Container type
  // Listening Types
  | 'abc_checkbox'
  | 'gap_fill_missing'
  | 'matching'
  | 'map_labeling'
  | 'multiple_choice'
  | 'gap_input';

export interface Question {
  id: string;
  questionNumber: number; // Global question number within the section
  text: string;
  answer?: string; // Correct answer
  alternativeAnswers?: string[]; // Alternative correct answers
  numbers?: number[]; // For checkbox multiple (e.g. [15, 16])
  fullOptions?: string[]; // Per-question options if applicable
}

export interface TestPart {
  id: string;
  type: QuestionType;
  title: string;
  instruction?: string;
  audioUrl?: string; // For listening parts
  passageTitle?: string; // For reading passages
  passageText?: string; // For reading passages
  imageUrl?: string; // For map labeling
  options?: string[]; // Shared options (e.g., ['A', 'B', 'C', 'D'])
  optionDescriptions?: string[]; // Descriptions for match options
  questions: Question[];
  hasPerQuestionOptions?: boolean;
  content?: string; // For gap fill text (contains placeholders like {1}, {2} or (BLANK))
  answerCount?: number; // For mc_multi
  nestedParts?: TestPart[]; // For reading passages with multiple question types
}

export interface WritingNestedPart {
  id: string;
  title: string;
  prompt: string;
  minWords?: number;
  suggestedMinutes?: number;
}

export interface WritingPart {
  id: string;
  title: string;
  prompt: string;
  minWords?: number;
  suggestedMinutes?: number;
  isNested?: boolean; // If true, it contains nested parts (e.g., Part 1.1 and Part 1.2)
  nestedParts?: WritingNestedPart[];
}

export interface Test {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: string;
  testType?: 'full' | 'practice';
  practiceSection?: SectionType;
  listeningBreakTime?: number; // in minutes (default 0)
  readingBreakTime?: number; // in minutes (default 0)
  listeningTime: number; // in minutes
  readingTime: number; // in minutes
  writingTime: number; // in minutes
  listeningParts: TestPart[];
  readingParts: TestPart[];
  writingParts: WritingPart[];
  listeningAudioUrl?: string;
}

export interface Submission {
  id: string;
  testId: string;
  testTitle: string;
  firstName: string;
  lastName: string;
  startedAt: string;
  submittedAt: string;
  isPractice: boolean;
  practiceSection?: SectionType;
  practicePartIndex?: number;
  listeningCorrect?: number;
  listeningTotal?: number;
  listeningCEFR?: number;
  readingCorrect?: number;
  readingTotal?: number;
  readingCEFR?: number;
  writingScore?: number; // Graded by admin (out of 9 or 100 or CEFR band)
  writingFeedback?: string;
  isGraded: boolean;
  answers: Record<string, string>; // { "1": "A", "2": "capital" }
  writingAnswers: Record<string, string>; // { "writing_part_1_1": "Essay...", "writing_part_2": "Essay..." }
}
