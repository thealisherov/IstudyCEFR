# CEFR Mock Test Platform — Technical Specification

> Bu hujjat loyihani amalga oshiradigan agent uchun yozilgan.  
> Barcha talablar, qoidalar va arxitektura qarorlari shu yerda jamlangan.

---

## 1. Loyiha Umumiy Ko'rinishi

CEFR Mock Test Platform — o'quvchilarga Listening, Reading va Writing bo'yicha mock test topshirish imkonini beruvchi Next.js full-stack web ilovasi. Loyiha **2 asosiy qismdan** iborat:

1. **Admin Panel** — testlarni yaratish, nashr qilish va submission natijalarini ko'rish
2. **Student (Test) Interface** — o'quvchilar test topshiradigan sahifa

---

## 2. Texnik Stack

| Texnologiya | Sabab |
|---|---|
| Next.js App Router | Server Components = tezroq, SEO yaxshi, API routes built-in |
| @supabase/ssr | Cookie-based auth, SSR bilan to'g'ri ishlaydi |
| TanStack Query | Server state, caching, realtime refetch, loading/error states |
| Zustand | Test yechish vaqtida client-only state (answers, timer, index) |
| React Hook Form + Zod | Type-safe forms, server-side validation bilan mos |
| Supabase Storage | Audio va rasm fayllar uchun, public bucket, CDN |
| Sonner | Eng yengil, chiroyli toast library |
| clsx + tailwind-merge | className conflict muammosini hal qiladi |
| WaveSurfer.js | Audio waveform, professional player |

---

## 3. Autentifikatsiya Qoidalari

### 3.1 Admin Auth
- Admin panel `/admin` yo'li ostida joylashgan.
- Admin faqat bitta akkaunt bilan kiradi (hardcoded yoki `.env`da saqlangan).
- `middleware.ts` orqali `/admin/**` yo'llari himoyalanadi.

### 3.2 Student Auth (Maxsus Tizim)

> Bu oddiy user/password autentifikatsiya EMAS. Quyidagi maxsus qoidalarga amal qilinadi:

- **Saytga kirishda** yagona `login` va `password` talab qilinadi.
- Bu login/password **barcha o'quvchilar uchun bir xil** — uni admin o'zi belgilaydi va o'zgartira oladi.
- Shared credentials admin panelida `Settings` bo'limida saqlanadi va tahrir qilinadi.
- Login sahifasida faqat bitta `username` va `password` field bo'ladi.
- Login muvaffaqiyatli bo'lgach, foydalanuvchi saytga kiradi.

### 3.3 Test Boshlashda Ism/Familiya Olish

- O'quvchi test boshlamoqchi bo'lganda modal yoki alohida sahifa chiqadi.
- Unda **Ism** va **Familiya** maydonlari bo'ladi (majburiy).
- Bu ma'lumotlar faqat **session davomida** saqlanadi (localStorage yoki sessionStorage).
- Test submit yoki exit qilinganda bu ma'lumotlar to'liq **o'chiriladi**.
- Keyingi safar test boshlananda yana ism/familiya so'raladi.

### 3.4 Session Persistence Qoidasi

```
Test davomida:  localStorage da saqlash (answers, timer, currentPart)
Refresh bo'lsa: Barcha ma'lumotlar saqlanib qoladi, test davom etadi
Submit bo'lsa:  localStorage + sessionStorage tozalanadi
Exit qilinsa:   localStorage + sessionStorage tozalanadi
Tab/window yopilsa: Saqlangan holat qoladi (keyingi ochilganda davom etadi)
```

---


## 5. Admin Panel

### 5.1 Navigatsiya Strukturasi

```
/admin
  /dashboard          — Umumiy statistika
  /tests              — Barcha testlar ro'yxati
  /tests/create       — Yangi test yaratish
  /tests/[id]/edit    — Testni tahrirlash
  /submissions        — Barcha submission natijalari
  /settings           — Shared login/password boshqaruvi
```

### 5.2 Test Yaratish Oqimi

1. **Test Info** tab:
   - Test sarlavhasi (title)
   - Sectionlar tartibi (Listening, Reading, Writing — drag-drop yoki order field)
   - Har bir section uchun **vaqt belgilash** (daqiqada, masalan: Listening = 30 min)

2. **Listening** tab:
   - O'ng tomonda Part turlari ro'yxati (yuqoridagi `PartType` enum asosida)
   - Part tanlangach, o'sha partga mos savol qo'shish form chiqadi
   - Audio fayl yuklash imkoniyati (Listening uchun)
   - Har bir part uchun savol raqamlari ketma-ket davom etadi (masalan: Part 1 → 1-8, Part 2 → 9-14...)

3. **Reading** tab:
   - O'ng tomonda question types paneli (rasmda ko'rsatilganidek)
   - Passage title va matn kiritish (B, I, New Line tugmalari bilan)
   - Passage matni va savollari birgalikda bir partda saqlanadi

4. **Writing** tab:
   - Task 1 va Task 2 uchun prompt/instructions kiritish

5. **Publish** tugmasi:
   - Barcha sectionlarda kamida bitta savol bo'lsa publish qilinadi
   - `isPublished = true` bo'lgach, o'quvchilar ko'radi

### 5.3 Question Type Panel (Admin)

Rasmda ko'rsatilgan o'ng panel — quyidagi turlarni o'z ichiga oladi:

**Reading:**
- Match Information *(faol holat — ko'k highlight)*
- Match Features
- Match Headings
- Multiple Choice (One)
- Multiple Choice (Multi)
- True/False/No Information
- Yes/No/No Information
- Gap Fill
- Summary Completion

**Listening (alohida panel):**
- ABC Checkbox (Part 1)
- Gap Fill / Missing Info (Part 2)
- Matching (Part 3)
- Map Labeling (Part 4)
- Multiple Choice (Part 5)
- Gap Input (Part 6)


### 5.5 Submissions Bo'limi

- Har bir submission: Ism Familiya, Test nomi, Sana, Score (section bo'yicha)
- Export CSV imkoniyati (ixtiyoriy)
- Filter: test nomi bo'yicha, sana bo'yicha

---

## 6. Student (Test) Interface

### 6.1 Test Sahifasi URL Strukturasi

```
/                  — Landing (mavjud testlar ro'yxati)
/test/[testId]     — Test yechish sahifasi
```

### 6.2 Test Interfeysi Layout

```
┌─────────────────────────────────────────────────────┐
│  HEADER: Test nomi | Section nomi | Taymer           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  CONTENT AREA:                                       │
│  - Listening: Audio player + savol komponentlari    │
│  - Reading: Passage (chap) | Savollar (o'ng)        │
│  - Writing: Prompt + textarea                       │
│                                                      │
├─────────────────────────────────────────────────────┤
│  BOTTOM NAVIGATOR (TestNavigator.jsx)               │
│  [Part 1] [Part 2] [Part 3] ... | [◄] [►] | [✓]   │
└─────────────────────────────────────────────────────┘
```

### 6.3 Taymer Qoidalari

- Test boshlanganida har bir section uchun admin belgilagan vaqt boshlanadi.
- Taymer headerdа ko'rinadi: `MM:SS` formatida.
- **Vaqt tugasa → o'sha section avtomatik submit qilinadi** va keyingi sectionga o'tiladi.
- Barcha sectionlar tugagach → test to'liq submit qilinadi.
- O'quvchi istagan vaqtda submit tugmasini bosishi mumkin (TestNavigator `✓` tugmasi).
- Refresh bo'lganda taymer `localStorage`dan tiklanadi: `remainingTime` saqlanadi.

### 6.4 localStorage Saqlanishi

```js
// Kalit: `cefr_test_${testId}`
{
  "firstName": "Ali",
  "lastName": "Karimov",
  "currentSection": 1,
  "currentPart": 2,
  "answers": { "1": "A", "2": "B", "3": "capital" },
  "sectionStartTime": 1718000000000,
  "remainingTime": 1245  // sekundda
}
```

**Tozalash holatlari:**
- Submit bosilganda: `localStorage.removeItem(`cefr_test_${testId}`)`
- Exit qilinganda (exit button): confirm modal → tasdiqlansa tozalanadi

### 6.5 Foydalaniladigan Komponentlar

Quyidagi tayyor komponentlar `components/mock/parts/` papkasida joylashadi va ularning mavjud kodi o'zgartirilmay ishlatiladi:

| Fayl | Ishlatilishi |
|---|---|
| `TrueFalse.jsx` | Multiple Choice (radio), True/False/NG, Yes/No/NG |
| `GapFill.jsx` | Gap filling — matn ichida `{questionNumber}` placeholder |
| `MatchDropdown.jsx` | Match Information, Match Features, Headings, Map Label |
| `CheckboxMultiple.jsx` | Checkbox multi-select (L_CHECKBOX_ABC, R_MULTIPLE_MULTI) |
| `TestNavigator.jsx` | Pastki navigator — part o'tish, prev/next, submit |


## 7. Savol Raqamlari Ketma-Ketligi

- Savol raqamlari sectionlar bo'yicha ketma-ket chiqadi (global numbering).
📖 Reading SectionNumber of questions: 35 questionsParts: Divided into 5 parts (Part 1: Q1-6, Part 2: Q7-14, Part 3: Q15-20, Part 4: Q21-29, Part 5: Q30-35)
Number of questions: 35 questionsParts: Divided into 6 parts
- Yoki har bir section o'z raqamlaridan boshlaydi — bu admin konfiguratsiyasida belgilanadi.
- **Tavsiya:** Har bir section 1-dan boshlansin (`perSectionNumbering: true`).
- `partQuestionRanges` TestNavigator uchun hisoblash backend yoki `useMemo` orqali bajariladi.

---

## 8. Score Hisoblash

Faqat **Listening** va **Reading** avtomatik baholanadi (to'g'ri javob solishtirish).  
**Writing** — admin tomonidan qo'lda baholanadi (submission ichida writing answers ko'rinadi).

```ts
// lib/scoring.ts
function calculateScore(answers: Record<string, string>, parts: Part[]): SectionScore {
  let correct = 0;
  let total = 0;
  for (const part of parts) {
    const questions = extractQuestions(part.data);
    for (const q of questions) {
      total++;
      const userAnswer = answers[String(q.questionNumber)];
      if (normalize(userAnswer) === normalize(q.answer)) correct++;
    }
  }
  return { correct, total };
}

function normalize(str?: string): string {
  return (str || '').trim().toLowerCase();
}
```

---


## 11. Papka Strukturasi (Qisqacha)

```
cefr-platform/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── tests/page.tsx
│   │   ├── tests/create/page.tsx
│   │   ├── tests/[id]/edit/page.tsx
│   │   ├── submissions/page.tsx
│   │   └── settings/page.tsx
│   ├── (student)/
│   │   ├── page.tsx               ← testlar ro'yxati
│   │   └── test/[testId]/page.tsx ← test yechish
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── tests/route.ts
│       ├── tests/[id]/route.ts
│       ├── submissions/route.ts
│       ├── settings/route.ts
│       └── upload/route.ts
│
├── components/
│   ├── admin/
│   │   ├── TestBuilder.tsx
│   │   ├── QuestionForm.tsx        ← part type'ga qarab dinamik
│   │   ├── PartTypePanel.tsx       ← o'ng panel (question type tanlash)
│   │   ├── AudioUploader.tsx
│   │   └── SectionTabs.tsx         ← Test Info | Reading | Listening | Writing
│   └── mock/
│       ├── TestTimer.tsx
│       ├── ListeningPlayer.tsx
│       ├── NameModal.tsx           ← test boshida ism/familiya so'rash
│       ├── ExitConfirmModal.tsx
│       └── parts/
│           ├── TrueFalse.jsx
│           ├── GapFill.jsx
│           ├── MatchDropdown.jsx
│           ├── CheckboxMultiple.jsx
│           └── TestNavigator.jsx
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── scoring.ts
│
├── types/
│   └── test.ts                     ← PartType, SectionType, interfaces
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── middleware.ts
```

---

## 12. Muhim Qoidalar Xulasasi (Agent Uchun)

| # | Qoida |
|---|---|
| 1 | Barcha o'quvchilar **bitta shared login/password** bilan kiradi |
| 2 | Har bir test boshida **ism va familiya** olinadi, submit/exit da o'chiriladi |
| 3 | Test davomida **refresh xavfsiz** — localStorage tiklanadi |
| 4 | Taymer **sectionga bog'liq** — vaqt tugasa auto-submit, keyingi sectionga o'tiladi |
| 5 | Admin har bir section uchun **vaqtni minutda belgilaydi** |
| 6 | Komponent kodlari (`TrueFalse`, `GapFill`, `MatchDropdown`, `CheckboxMultiple`, `TestNavigator`) **o'zgartirilmasdan** ishlatiladi |
| 7 | Part `data` field — **JSON** — har bir part turi o'z sxemasiga ega (5-bo'lim) |
| 8 | Savol raqamlari **global unique** bo'lishi kerak (har bir sectionda 1dan boshlanishi mumkin) |
| 9 | Writing **avtomatik baholanmaydi** — admin qo'lda ko'radi |
| 10 | Test faqat admin **Publish** qilgandan keyin o'quvchilarga ko'rinadi |
| 11 | Listening va reADING SHU ASOSISDA AVTOMATIK BAHOLANADI ADMIN PANELIDA QUESTIONLLARNI TUZAYOTGANDA TO'GRI JAVOBLAR KIRITILADI |