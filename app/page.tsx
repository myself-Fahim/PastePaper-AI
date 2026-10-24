
"use client";

import { useState } from "react";
import {
  BookOpen,
  Upload,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  GraduationCap,
  Brain,
  ChevronDown,
  X,
} from "lucide-react";

type Topic = {
  name: string;
  frequency: number;
  years: string[];
  category: "A" | "B" | "C";
  reason: string;
  studyPlan: string[];
  practiceQuestions: string[];
  modelAnswer: string;
};

type Analysis = {
  summary: string;
  topics: Topic[];
};
type QuizQuestion = { question: string; options: string[]; answer: number | string; explanation: string };

export default function Home() {
  const [subject, setSubject] = useState(
    "Database Management Systems"
  );
  const [questionText, setQuestionText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedAnswers, setExpandedAnswers] = useState<number[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  function handleFileChange(selectedFile?: File) {
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > 8 * 1024 * 1024) {
      setError("PDF must be 8 MB or smaller.");
      return;
    }

    setFile(selectedFile);
  }

  async function analyzePapers() {
    if (!subject.trim()) {
      setError("Please enter a subject name.");
      return;
    }

    if (!file && questionText.trim().length < 30) {
      setError(
        "Upload a PDF or paste at least 30 characters of questions."
      );
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setExpandedAnswers([]);

    try {
      const formData = new FormData();

      formData.append("subject", subject.trim());
      formData.append("questionText", questionText);

      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const rawResponse = await response.text();

      let data;

      try {
        data = JSON.parse(rawResponse);
      } catch {
        throw new Error(
          `Server returned an unexpected response (HTTP ${response.status}). Check the terminal.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      if (
        !data.analysis ||
        !Array.isArray(data.analysis.topics)
      ) {
        throw new Error("The AI returned an invalid analysis.");
      }

      setAnalysis(data.analysis);
      setSourceText(data.extractedText || questionText);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generatePracticeQuiz() {
    setQuizLoading(true); setError(""); setQuiz(null); setQuizSubmitted(false); setQuizAnswers({});
    try {
      const response = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: subject.trim(), sourceText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate practice quiz.");
      setQuiz(data.quiz.questions);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not generate practice quiz."); }
    finally { setQuizLoading(false); }
  }

  function toggleAnswer(index: number) {
    setExpandedAnswers((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    );
  }

  function resetAnalysis() {
    setAnalysis(null);
    setError("");
    setExpandedAnswers([]);
  }

  const priorityStyles = {
    A: "border-rose-200 bg-rose-50 text-rose-700",
    B: "border-amber-200 bg-amber-50 text-amber-700",
    C: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-slate-800 [&_.text-slate-200]:text-slate-700 [&_.text-slate-300]:text-slate-700 [&_.text-slate-400]:text-slate-600 [&_.text-slate-500]:text-slate-600 [&_.text-rose-200]:text-rose-700 [&_.text-rose-300]:text-rose-700 [&_.text-amber-300]:text-amber-700 [&_.text-emerald-300]:text-emerald-700 [&_.text-violet-300]:text-violet-700 [&_.text-violet-400]:text-violet-700 [&_.text-indigo-300]:text-indigo-700">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={resetAnalysis}
            className="flex items-center gap-3"
            aria-label="Go to PastPaper AI home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <BookOpen size={22} />
            </span>
            <span className="text-lg font-bold tracking-tight">
              PastPaper <span className="text-emerald-600">AI</span>
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AI Study Assistant
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-96 -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
            <Sparkles size={14} />
            STUDY SMARTER WITH AI
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Turn past papers into
            <span className="mt-2 block bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              your study strategy.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Upload previous exam papers or paste questions. Discover
            recurring topics, understand what to prioritize, and get
            a personalized path to exam preparation.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <FileText size={14} /> PDF & text
            </span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Brain size={14} /> AI topic analysis
            </span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <GraduationCap size={14} /> Study planning
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {/* Input Form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-7 flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <FileText size={21} />
            </span>

            <div>
              <h2 className="text-xl font-semibold">
                Analyze your past papers
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add your subject and upload a PDF or paste exam questions.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Subject name
              </label>

              <input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Upload exam papers
                <span className="ml-2 font-normal text-slate-600">
                  (Optional)
                </span>
              </label>

              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition ${
                  file
                    ? "border-violet-400/50 bg-violet-400/[0.06]"
                    : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50"
                }`}
              >
                {file ? (
                  <>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                      <FileText size={24} />
                    </span>

                    <span className="max-w-full break-all text-sm font-medium text-slate-200">
                      {file.name}
                    </span>

                    <span className="mt-2 text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-slate-300">
                      <Upload size={23} />
                    </span>

                    <span className="text-sm font-medium text-slate-700">
                      Click to upload a PDF
                    </span>

                    <span className="mt-2 text-xs text-slate-500">
                      PDF only · Maximum file size 8 MB
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0])
                  }
                />
              </label>

              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600 transition hover:text-rose-500"
                >
                  <X size={14} />
                  Remove PDF
                </button>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-600">
                Text-based PDFs work best. Scanned image-only PDFs
                may require OCR.
              </p>
            </div>

            {/* Text Input */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="questions"
                className="text-sm font-medium text-slate-700"
                >
                  Paste exam questions
                </label>

                <span className="text-xs text-slate-500">
                  {questionText.length} characters
                </span>
              </div>

              <p className="mb-2 text-xs text-slate-600">
                Paste exam questions here, or upload a PDF above.
              </p>

              <textarea
                id="questions"
                value={questionText}
                onChange={(event) =>
                  setQuestionText(event.target.value)
                }
                rows={9}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/10"
              />

              <p className="mt-2 text-xs text-slate-600">
                Include exam years if available so the AI can use
                them as evidence.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700"
              >
                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />
                <p className="leading-6">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={analyzePapers}
              disabled={
                loading ||
                !subject.trim() ||
                (!file && questionText.trim().length < 30)
              }
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                  Analyzing your papers...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyze Papers
                </>
              )}
            </button>

            {loading && (
              <p className="text-center text-xs leading-6 text-slate-500">
                Extracting topics and generating your study insights.
                This may take a little while.
              </p>
            )}
          </div>
        </section>

        {/* Analysis Results */}
        {analysis && (
          <section
            id="analysis-results"
            className="mt-12 space-y-7"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                  <CheckCircle2 size={15} />
                  Analysis complete
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  Your study insights
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  {analysis.summary}
                </p>
              </div>

              <button
                onClick={resetAnalysis}
                className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                New analysis
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-sm text-slate-400">
                  Topics identified
                </span>
                <p className="mt-3 text-3xl font-bold">
                  {analysis.topics.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-sm text-slate-400">
                  High priority
                </span>
                <p className="mt-3 text-3xl font-bold text-rose-300">
                  {
                    analysis.topics.filter(
                      (topic) => topic.category === "A"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-sm text-slate-400">
                  Other topics
                </span>
                <p className="mt-3 text-3xl font-bold text-violet-300">
                  {
                    analysis.topics.filter(
                      (topic) => topic.category !== "A"
                    ).length
                  }
                </p>
              </div>
            </div>

            {/* Topic Cards */}
            {analysis.topics.map((topic, index) => (
              <article
                key={`${topic.name}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold sm:text-xl">
                        {topic.name}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Reported frequency: {topic.frequency}
                        {" · "}
                        Years:{" "}
                        {topic.years?.length
                          ? topic.years.join(", ")
                          : "Not identified"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      priorityStyles[topic.category] ??
                      priorityStyles.C
                    }`}
                  >
                    Priority {topic.category}
                  </span>
                </div>

                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm leading-7 text-slate-700">
                    {topic.reason}
                  </p>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {/* Study Plan */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                      <BookOpen size={17} />
                      Recommended study plan
                    </h4>

                    {topic.studyPlan?.length ? (
                      <ol className="mt-4 space-y-3">
                        {topic.studyPlan.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm leading-6 text-slate-300"
                          >
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs text-violet-300">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No study plan available.
                      </p>
                    )}
                  </div>

                  {/* Practice Questions */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                      <Brain size={17} />
                      Practice questions
                    </h4>

                    {topic.practiceQuestions?.length ? (
                      <ul className="mt-4 space-y-3">
                        {topic.practiceQuestions.map(
                          (question, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm leading-6 text-slate-300"
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                              <span>{question}</span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No practice questions available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Model Answer */}
                <div className="mt-6 border-t border-white/[0.08] pt-5">
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                    aria-expanded={expandedAnswers.includes(index)}
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      View model answer
                    </span>

                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        expandedAnswers.includes(index)
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {expandedAnswers.includes(index) && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {topic.modelAnswer ||
                          "No model answer available."}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {analysis.topics.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-300">
                  No topics were identified. Try adding more exam questions.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Ready to test your knowledge?</h3>
              <p className="mt-2 text-sm text-slate-600">Generate a subject-specific practice quiz from these past-paper topics.</p>
              <button type="button" onClick={generatePracticeQuiz} disabled={quizLoading} className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                {quizLoading ? <LoaderCircle size={17} className="animate-spin" /> : <GraduationCap size={17} />}
                {quizLoading ? "Generating practice quiz..." : "Generate Practice Quiz"}
              </button>
            </div>

            {quiz && <div className="space-y-4">{quiz.map((item, index) => <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-medium text-slate-800">{index + 1}. {item.question}</p>{item.options.length > 0 ? <div className="mt-4 grid gap-2">{item.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [index]: String(optionIndex) })} className={`rounded-lg border p-3 text-left text-sm ${quizAnswers[index] === String(optionIndex) ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{option}</button>)}</div> : <input className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" placeholder="Type your answer" onChange={(event) => setQuizAnswers({ ...quizAnswers, [index]: event.target.value })} />}{quizSubmitted && <p className="mt-3 text-sm text-slate-700">{typeof item.answer === "number" ? `Correct answer: ${item.options[item.answer]}. ` : `Ideal answer: ${item.answer}. `}{item.explanation}</p>}</article>)}<button type="button" onClick={() => setQuizSubmitted(true)} className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Submit Answers</button></div>}

            <div className="flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-xs leading-6 text-slate-400">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <p>
                Priorities are based on AI analysis of the supplied
                material. They are study guidance, not guarantees of
                future exam questions. Verify reported frequencies
                and years against the original papers.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 py-7 text-center">
        <p className="text-sm font-semibold text-slate-700">
          PastPaper <span className="text-violet-400">AI</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Built to make exam preparation more focused and effective.
        </p>
      </footer>
    </main>
  );
}
