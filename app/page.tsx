
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
    A: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    B: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    C: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  };

  return (
    <main className="min-h-screen bg-[#080B14] text-slate-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#080B14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={resetAnalysis}
            className="flex items-center gap-3"
            aria-label="Go to PastPaper AI home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20">
              <BookOpen size={22} />
            </span>
            <span className="text-lg font-bold tracking-tight">
              PastPaper <span className="text-violet-400">AI</span>
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI Study Assistant
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-96 -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-xs font-medium text-violet-300">
            <Sparkles size={14} />
            STUDY SMARTER WITH AI
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Turn past papers into
            <span className="mt-2 block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
              your study strategy.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Upload previous exam papers or paste questions. Discover
            recurring topics, understand what to prioritize, and get
            a personalized path to exam preparation.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <FileText size={14} /> PDF & text
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <Brain size={14} /> AI topic analysis
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <GraduationCap size={14} /> Study planning
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {/* Input Form */}
        <section className="rounded-3xl border border-white/10 bg-[#101522] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-7 flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
              <FileText size={21} />
            </span>

            <div>
              <h2 className="text-xl font-semibold">
                Analyze your past papers
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Add your subject and upload a PDF or paste exam questions.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Subject name
              </label>

              <input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#090D17] px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10"
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Upload exam papers
                <span className="ml-2 font-normal text-slate-500">
                  (Optional)
                </span>
              </label>

              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition ${
                  file
                    ? "border-violet-400/50 bg-violet-400/[0.06]"
                    : "border-white/15 bg-[#090D17] hover:border-violet-400/40 hover:bg-violet-400/[0.03]"
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

                    <span className="text-sm font-medium text-slate-200">
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
                  className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-rose-300"
                >
                  <X size={14} />
                  Remove PDF
                </button>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Text-based PDFs work best. Scanned image-only PDFs
                may require OCR.
              </p>
            </div>

            {/* Text Input */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="questions"
                  className="text-sm font-medium text-slate-200"
                >
                  Paste exam questions
                </label>

                <span className="text-xs text-slate-500">
                  {questionText.length} characters
                </span>
              </div>

              <p className="mb-2 text-xs text-slate-500">
                Paste exam questions here, or upload a PDF above.
              </p>

              <textarea
                id="questions"
                value={questionText}
                onChange={(event) =>
                  setQuestionText(event.target.value)
                }
                rows={9}
                className="w-full resize-y rounded-xl border border-white/10 bg-[#090D17] px-4 py-4 text-sm leading-7 outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10"
              />

              <p className="mt-2 text-xs text-slate-500">
                Include exam years if available so the AI can use
                them as evidence.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-200"
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
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  {analysis.summary}
                </p>
              </div>

              <button
                onClick={resetAnalysis}
                className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05]"
              >
                New analysis
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#101522] p-5">
                <span className="text-sm text-slate-400">
                  Topics identified
                </span>
                <p className="mt-3 text-3xl font-bold">
                  {analysis.topics.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#101522] p-5">
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

              <div className="rounded-2xl border border-white/10 bg-[#101522] p-5">
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
                className="rounded-2xl border border-white/10 bg-[#101522] p-5 sm:p-7"
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

                <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm leading-7 text-slate-300">
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
                    <span className="text-sm font-semibold text-slate-200">
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
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#090D17] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {topic.modelAnswer ||
                          "No model answer available."}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {analysis.topics.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#101522] p-8 text-center">
                <p className="text-slate-300">
                  No topics were identified. Try adding more exam questions.
                </p>
              </div>
            )}

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
      <footer className="border-t border-white/[0.08] px-5 py-7 text-center">
        <p className="text-sm font-semibold text-slate-300">
          PastPaper <span className="text-violet-400">AI</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Built to make exam preparation more focused and effective.
        </p>
      </footer>
    </main>
  );
}
