import { Test, Submission, TestPart, WritingPart, Question } from '@/types/test';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// =============================================
// LOCAL STORAGE KEYS (Fallback mode)
// =============================================
const SETTINGS_KEY = 'cefr_shared_settings';
const TESTS_KEY = 'cefr_tests';
const SUBMISSIONS_KEY = 'cefr_submissions';

export interface SharedSettings {
  sharedUsername: string;
  sharedPasswordHash: string;
}

const DEFAULT_SETTINGS: SharedSettings = {
  sharedUsername: 'student',
  sharedPasswordHash: 'cefr2026',
};

// =============================================
// SEED DATA (used for localStorage fallback)
// =============================================
const MOCK_TESTS: Test[] = [
  {
    id: 'test-cefr-1',
    title: 'CEFR English Mock Exam - Set A',
    isPublished: true,
    createdAt: new Date().toISOString(),
    listeningTime: 30,
    readingTime: 35,
    writingTime: 40,
    listeningParts: [
      {
        id: 'l-part-1',
        type: 'abc_checkbox',
        title: 'Listening Part 1',
        instruction: 'Questions 1–6. For each question, choose the correct letter, A, B or C.',
        audioUrl: '',
        options: ['A', 'B', 'C'],
        questions: [
          { id: 'l-q1', questionNumber: 1, numbers: [1], text: 'What is the main topic of the conversation?' },
          { id: 'l-q2', questionNumber: 2, numbers: [2], text: 'Where did the speaker go yesterday?' },
          { id: 'l-q3', questionNumber: 3, numbers: [3], text: 'Which item did they buy?' },
          { id: 'l-q4', questionNumber: 4, numbers: [4], text: 'How much did the ticket cost?' },
          { id: 'l-q5', questionNumber: 5, numbers: [5], text: 'When is the meeting scheduled?' },
          { id: 'l-q6', questionNumber: 6, numbers: [6], text: 'Why was the flight delayed?' }
        ],
        hasPerQuestionOptions: false,
        optionDescriptions: []
      },
      {
        id: 'l-part-2',
        type: 'gap_fill_missing',
        title: 'Listening Part 2',
        instruction: 'Questions 7–14. Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        audioUrl: '',
        content: `
          <h3>Volunteer Project Details</h3>
          <p>Location: New Forest National Park</p>
          <p>Start Date: {7}</p>
          <p>Minimum age required: {8} years old</p>
          <p>Main task: Planting trees and maintaining {9}</p>
          <p>Accomodation: Shared tents in a campsite</p>
          <p>Volunteers must bring their own: {10}</p>
          <p>Food: Provided by the local {11} association</p>
          <p>Weekend activity: Guided walk around the {12}</p>
          <p>Contact person: Ms. Karen {13}</p>
          <p>Phone number: {14}</p>
        `,
        questions: [
          { id: 'l-q7', questionNumber: 7, text: 'Start Date' },
          { id: 'l-q8', questionNumber: 8, text: 'Minimum age' },
          { id: 'l-q9', questionNumber: 9, text: 'Main task' },
          { id: 'l-q10', questionNumber: 10, text: 'Volunteers must bring' },
          { id: 'l-q11', questionNumber: 11, text: 'Food provided by' },
          { id: 'l-q12', questionNumber: 12, text: 'Weekend activity' },
          { id: 'l-q13', questionNumber: 13, text: 'Contact person' },
          { id: 'l-q14', questionNumber: 14, text: 'Phone number' }
        ]
      },
      {
        id: 'l-part-3',
        type: 'matching',
        title: 'Listening Part 3',
        instruction: 'Questions 15–20. Which feature is mentioned for each of the following museums? Choose from A-G in the list of options.',
        audioUrl: '',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        optionDescriptions: [
          'A. Has free admission daily',
          'B. Famous for its interactive science exhibits',
          'C. Recently renovated historical building',
          'D. Features a world-renowned garden cafe',
          'E. Offers guided audio-walks in 12 languages',
          'F. Displays modern digital art projects',
          'G. Specifically designed for young children'
        ],
        questions: [
          { id: 'l-q15', questionNumber: 15, text: 'The National History Museum' },
          { id: 'l-q16', questionNumber: 16, text: 'The Science Discovery Center' },
          { id: 'l-q17', questionNumber: 17, text: 'The Royal Gallery of Arts' },
          { id: 'l-q18', questionNumber: 18, text: 'The Botanical Gardens Exhibition' },
          { id: 'l-q19', questionNumber: 19, text: 'The Childrens Heritage Hub' },
          { id: 'l-q20', questionNumber: 20, text: 'The Modern Digital Art Space' }
        ]
      }
    ],
    readingParts: [
      {
        id: 'r-part-1',
        type: 'gap_fill',
        title: 'Reading Part 1',
        passageTitle: 'The Evolution of Optimism',
        passageText: `
          <p>Optimism is more than just looking at the bright side of things; researchers have discovered that it has a profound effect on physical well-being. A recent study conducted at Harvard University tracked over 70,000 women over a span of eight years. It found that the optimists had significantly better lung function than women who were more pessimistic. This is the first study to show such a link.</p>
          <p>The research team at Brigham and Womens Hospital in Boston analysed data on the women's general health, diet, and physical activity levels. They concluded that optimistic thinking was associated with a 30% lower risk of dying from several major illnesses, including cardiovascular diseases and infection. This remained true even after taking health behaviors and demographics into account.</p>
          <p>So, what exactly happens in the body when we think positively? Scientists suggest that optimism plays a key role in reducing inflammation. High levels of stress hormones, like cortisol, are known to weaken the immune system. Optimistic individuals tend to regulate stress more effectively, keeping their immune defenses strong.</p>
        `,
        instruction: 'Questions 1–6. Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
        content: `
          <h3>Summary: Positive Thinking and Health</h3>
          <p>A landmark study at Harvard University tracked 70,000 women and discovered that optimists possessed superior {1} compared to their pessimistic counterparts. The researchers analyzed factors such as health, diet, and {2} to reach their conclusions. Positive thinking is linked with a {3} decrease in the risk of mortality from major diseases, like {4} conditions. Physiologically, optimism helps in lowering {5} and counteracts the harmful effects of stress hormones like {6}, which otherwise impair the immune system.</p>
        `,
        questions: [
          { id: 'r-q1', questionNumber: 1, text: 'Question 1' },
          { id: 'r-q2', questionNumber: 2, text: 'Question 2' },
          { id: 'r-q3', questionNumber: 3, text: 'Question 3' },
          { id: 'r-q4', questionNumber: 4, text: 'Question 4' },
          { id: 'r-q5', questionNumber: 5, text: 'Question 5' },
          { id: 'r-q6', questionNumber: 6, text: 'Question 6' }
        ]
      },
      {
        id: 'r-part-2',
        type: 'tf_ng',
        title: 'Reading Part 2',
        passageTitle: 'The Mysteries of Bird Migration',
        passageText: `
          <p>Every year, billions of birds embark on spectacular journeys across continents. How they navigate over vast oceans and featureless deserts with pinpoint accuracy remains one of nature's greatest mysteries. For decades, ornithologists believed that birds relied purely on visual landmarks, such as coastlines and river valleys, to find their way.</p>
          <p>However, modern tracking technology has revealed that birds possess an array of sophisticated navigation systems. Some species use the position of the sun during the day and the stars at night. Others rely on a biological compass sensitive to the Earth's magnetic field. This magnetoreception is believed to be linked to specialized proteins in the birds' eyes, allowing them to literally "see" magnetic lines.</p>
          <p>Interestingly, some birds also utilize olfactory cues, mapping their routes using familiar scents carried on the wind. While younger birds often make mistakes during their first journey, older, more experienced birds can adjust their route even if blown hundreds of miles off course by storms.</p>
        `,
        instruction: 'Questions 7–14. Do the following statements agree with the information given in the Reading Passage? Choose: TRUE, FALSE or NO INFORMATION.',
        options: ['TRUE', 'FALSE', 'NO INFORMATION'],
        questions: [
          { id: 'r-q7', questionNumber: 7, text: "Ornithologists have always known that birds utilize Earth's magnetic fields to navigate." },
          { id: 'r-q8', questionNumber: 8, text: 'Visual landmarks are the only tool birds use for short-distance migration.' },
          { id: 'r-q9', questionNumber: 9, text: 'Some birds are able to sense magnetic fields using specific proteins located in their eyes.' },
          { id: 'r-q10', questionNumber: 10, text: 'Smell is never used by migrating birds to find their destination.' },
          { id: 'r-q11', questionNumber: 11, text: 'Older birds are better at correcting course errors caused by bad weather than young birds.' },
          { id: 'r-q12', questionNumber: 12, text: 'Ornithologists can track the exact coordinates of birds in real-time using modern micro-tags.' },
          { id: 'r-q13', questionNumber: 13, text: 'Storms cause more deaths in migrating young birds than in older birds.' },
          { id: 'r-q14', questionNumber: 14, text: 'Magnetic navigation is faster than star-based navigation.' }
        ]
      }
    ],
    writingParts: [
      {
        id: 'w-part-1',
        title: 'Writing Task 1',
        prompt: 'You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        isNested: true,
        nestedParts: [
          {
            id: 'w-part-1-1',
            title: 'Task 1.1: Email Response',
            prompt: 'Read this email from your English tutor. Write an email to your tutor in reply, explaining why you missed the seminar, what you did to catch up, and when you can meet him to discuss your draft essay. Write at least 80 words.',
            minWords: 80,
            suggestedMinutes: 10
          },
          {
            id: 'w-part-1-2',
            title: 'Task 1.2: Diagram Description',
            prompt: 'The chart below shows the number of three types of visitors to a museum between 1997 and 2012. Summarise the main trends and make comparisons where relevant. Write at least 100 words.',
            minWords: 100,
            suggestedMinutes: 10
          }
        ]
      },
      {
        id: 'w-part-2',
        title: 'Writing Task 2',
        prompt: 'You should spend about 20 minutes on this task. Write an essay in response to the topic below. Write at least 250 words.',
        minWords: 250,
        suggestedMinutes: 20,
        isNested: false
      }
    ]
  }
];

// =============================================
// HELPER: Supabase DB row → App Test object
// =============================================
function dbRowToTest(row: any): Test {
  return {
    id: row.id,
    title: row.title,
    isPublished: row.is_published,
    createdAt: row.created_at,
    listeningTime: row.listening_time,
    readingTime: row.reading_time,
    writingTime: row.writing_time,
    listeningParts: row.listening_parts || [],
    readingParts: row.reading_parts || [],
    writingParts: row.writing_parts || [],
    listeningAudioUrl: row.listening_audio_url || '',
  };
}

function testToDbRow(test: Test): any {
  return {
    id: test.id,
    title: test.title,
    is_published: test.isPublished,
    listening_time: test.listeningTime,
    reading_time: test.readingTime,
    writing_time: test.writingTime,
    listening_parts: test.listeningParts,
    reading_parts: test.readingParts,
    writing_parts: test.writingParts,
    listening_audio_url: test.listeningAudioUrl || '',
  };
}

function dbRowToSubmission(row: any): Submission {
  return {
    id: row.id,
    testId: row.test_id,
    testTitle: row.test_title,
    firstName: row.first_name,
    lastName: row.last_name,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    isPractice: row.is_practice,
    practiceSection: row.practice_section,
    practicePartIndex: row.practice_part_index,
    listeningCorrect: row.listening_correct,
    listeningTotal: row.listening_total,
    listeningCEFR: row.listening_cefr,
    readingCorrect: row.reading_correct,
    readingTotal: row.reading_total,
    readingCEFR: row.reading_cefr,
    writingScore: row.writing_score,
    writingFeedback: row.writing_feedback,
    isGraded: row.is_graded,
    answers: row.answers || {},
    writingAnswers: row.writing_answers || {},
  };
}

function submissionToDbRow(sub: Submission): any {
  return {
    test_id: sub.testId,
    test_title: sub.testTitle,
    first_name: sub.firstName,
    last_name: sub.lastName,
    started_at: sub.startedAt,
    submitted_at: sub.submittedAt,
    is_practice: sub.isPractice,
    practice_section: sub.practiceSection || null,
    practice_part_index: sub.practicePartIndex ?? null,
    listening_correct: sub.listeningCorrect ?? 0,
    listening_total: sub.listeningTotal ?? 0,
    listening_cefr: sub.listeningCEFR ?? 0,
    reading_correct: sub.readingCorrect ?? 0,
    reading_total: sub.readingTotal ?? 0,
    reading_cefr: sub.readingCEFR ?? 0,
    writing_score: sub.writingScore ?? null,
    writing_feedback: sub.writingFeedback ?? null,
    is_graded: sub.isGraded,
    answers: sub.answers,
    writing_answers: sub.writingAnswers,
  };
}

// =============================================
// SETTINGS
// =============================================
export function getSharedSettings(): SharedSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  // Try Supabase first (async pattern won't work here — use cached)
  // Settings are cached in localStorage after first Supabase fetch
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    // Trigger async Supabase sync
    if (isSupabaseConfigured()) {
      syncSettingsFromSupabase();
    }
    return DEFAULT_SETTINGS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function syncSettingsFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shared_credentials')
      .single();

    if (data?.value) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.value));
    }
  } catch {
    // Supabase not available, keep localStorage
  }
}

export async function saveSharedSettings(settings: SharedSettings): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('settings')
        .upsert({
          key: 'shared_credentials',
          value: settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
    } catch {
      // Supabase error — localStorage is the fallback
    }
  }
}

// =============================================
// TESTS
// =============================================
export function getTests(): Test[] {
  if (typeof window === 'undefined') return MOCK_TESTS;

  const stored = localStorage.getItem(TESTS_KEY);
  if (!stored) {
    localStorage.setItem(TESTS_KEY, JSON.stringify(MOCK_TESTS));
    // Trigger async Supabase sync
    if (isSupabaseConfigured()) {
      syncTestsFromSupabase();
    }
    return MOCK_TESTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK_TESTS;
  }
}

/**
 * Async version: fetch fresh tests from Supabase.
 * Components that need real-time data should call this.
 */
export async function getTestsAsync(): Promise<Test[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getTests();

  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      const tests = data.map(dbRowToTest);
      localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
      return tests;
    }
  } catch {
    // Fall back to localStorage
  }
  return getTests();
}

async function syncTestsFromSupabase(): Promise<void> {
  try {
    await getTestsAsync();
  } catch {
    // Silent fallback
  }
}

export function getTestById(id: string): Test | undefined {
  const tests = getTests();
  return tests.find(t => t.id === id);
}

export async function getTestByIdAsync(id: string): Promise<Test | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return getTestById(id);

  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (data) return dbRowToTest(data);
  } catch {
    // Fall back
  }
  return getTestById(id);
}

export async function saveTest(test: Test): Promise<void> {
  if (typeof window === 'undefined') return;

  // Always update localStorage immediately for responsive UI
  const tests = getTests();
  const index = tests.findIndex(t => t.id === test.id);
  if (index >= 0) {
    tests[index] = test;
  } else {
    tests.push(test);
  }
  localStorage.setItem(TESTS_KEY, JSON.stringify(tests));

  // Sync to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const row = testToDbRow(test);
      await supabase
        .from('tests')
        .upsert(row, { onConflict: 'id' });
    } catch {
      // Supabase error — localStorage is the fallback
    }
  }
}

export async function deleteTest(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const tests = getTests();
  const filtered = tests.filter(t => t.id !== id);
  localStorage.setItem(TESTS_KEY, JSON.stringify(filtered));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('tests')
        .delete()
        .eq('id', id);
    } catch {
      // Supabase error — localStorage already updated
    }
  }
}

// =============================================
// SUBMISSIONS
// =============================================
export function getSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(SUBMISSIONS_KEY);
  if (!stored) {
    if (isSupabaseConfigured()) {
      syncSubmissionsFromSupabase();
    }
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function getSubmissionsAsync(): Promise<Submission[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getSubmissions();

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const subs = data.map(dbRowToSubmission);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
      return subs;
    }
  } catch {
    // Fall back
  }
  return getSubmissions();
}

async function syncSubmissionsFromSupabase(): Promise<void> {
  try {
    await getSubmissionsAsync();
  } catch {
    // Silent fallback
  }
}

export async function saveSubmission(submission: Submission): Promise<void> {
  if (typeof window === 'undefined') return;

  // Update localStorage immediately
  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === submission.id);
  if (index >= 0) {
    submissions[index] = submission;
  } else {
    submissions.push(submission);
  }
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

  // Sync to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const row = submissionToDbRow(submission);
      // For new submissions, don't send id (let Supabase generate UUID)
      if (submission.id.startsWith('sub-')) {
        // Client-generated ID — insert without id to get DB UUID
        const { data } = await supabase
          .from('submissions')
          .insert(row)
          .select('id')
          .single();
        
        // Update local submission with real DB id
        if (data?.id) {
          const idx = submissions.findIndex(s => s.id === submission.id);
          if (idx >= 0) {
            submissions[idx].id = data.id;
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
          }
        }
      } else {
        // Existing DB UUID — upsert
        await supabase
          .from('submissions')
          .upsert({ id: submission.id, ...row }, { onConflict: 'id' });
      }
    } catch {
      // Supabase error — localStorage already updated
    }
  }
}

export function getSubmissionById(id: string): Submission | undefined {
  const submissions = getSubmissions();
  return submissions.find(s => s.id === id);
}

// =============================================
// INIT: Call this on app startup to sync from Supabase
// =============================================
export async function initializeDataLayer(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await Promise.allSettled([
    syncSettingsFromSupabase(),
    syncTestsFromSupabase(),
    syncSubmissionsFromSupabase(),
  ]);
}
