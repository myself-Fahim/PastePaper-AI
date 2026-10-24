# PastePaperAI

PastePaperAI turns previous exam papers into a focused study plan, explanations, learning resources, and interactive practice quizzes.

## What it solves

Students often have past papers but no simple way to identify repeated topics, prioritize revision, understand difficult concepts, or measure their preparation. PastePaperAI analyzes past questions for a specific subject and converts them into practical study guidance.

## Features

### Past-paper analysis

Enter a subject name, upload a PDF, or paste exam questions. The system identifies recurring topics, frequency, available years, priority levels, study plans, and practice questions.

### Scanned PDF support

Text-based PDFs are processed with PDF.js. Scanned or image-only PDFs automatically use OCR through Tesseract.js, so students do not need to type every question manually.

### Subject matching

The system checks whether the entered subject matches the supplied exam material. A mismatch returns a clear error instead of producing unrelated analysis.

### Topic prioritization

- **A:** strongest historical evidence or repetition
- **B:** moderate evidence
- **C:** limited evidence

Priorities are study guidance, not guaranteed predictions.

### Four explanation modes

Each topic can be explained as:

- **Beginner explanation:** step-by-step plain-language teaching with examples
- **Exam-ready answer:** structured, moderately elaborate answer for written exams
- **One-minute revision:** compact high-yield summary
- **Memory trick:** mnemonic, analogy, or association for recall

### Related resources

Each topic has individual learning resources. The system uses valid AI-provided HTTPS links when available and provides topic-specific Google and YouTube learning searches as a fallback.

### Interactive practice quiz

After analysis, students can generate subject-specific MCQs and short-answer questions, select or type answers, submit the quiz, and review explanations. Correct selected answers are highlighted green and incorrect selected answers red.

## Student workflow

1. Enter the exact subject name.
2. Upload a PDF or paste at least 30 characters of questions.
3. Select **Analyze Papers**.
4. Review topic frequency, years, priorities, study plans, and practice questions.
5. Open **Explain this topic in different ways** and select an explanation mode.
6. Open the resources listed for each topic.
7. Select **Generate Practice Quiz**.
8. Submit answers and review mistakes, correct answers, and explanations.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS and Lucide React
- Ollama Cloud for analysis and quiz generation
- PDF.js for selectable text extraction
- Tesseract.js and `@napi-rs/canvas` for scanned-PDF OCR

## Getting started

### Requirements

- Node.js 20 or newer
- Ollama Cloud API key
- An Ollama model that supports JSON responses

### Installation

```bash
npm install
```

Create `.env.local`:

```env
OLLAMA_API_KEY=your_ollama_api_key
OLLAMA_MODEL=your_model_name
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript validation
```

## API routes

- `POST /api/analyze` — extracts content, performs OCR when needed, validates the subject, and generates topic analysis.
- `POST /api/practice` — generates a practice quiz from the analyzed material.

## Project structure

```text
app/
├── api/analyze/route.ts     # Extraction, OCR, validation, and analysis
├── api/practice/route.ts    # Practice quiz generation
├── page.tsx                 # Main student interface
└── layout.tsx               # Application layout
```

## Limitations

OCR quality depends on scan quality. AI results depend on the supplied papers and selected model. Priorities are not guaranteed predictions, and students should verify external resources before relying on them.

## License

This project is intended for educational and hackathon use. Add a project-specific license before public distribution.
