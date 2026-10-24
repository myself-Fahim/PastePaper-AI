
"use client";

import { useState } from "react";

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
  const [subject, setSubject] = useState("Database Management Systems");
  const [questionText, setQuestionText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzePapers() {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject, questionText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold text-violet-400">
            AI-POWERED EXAM PREPARATION
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            PastPaper <span className="text-violet-400">AI</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Analyze past papers. Discover important topics. Study smarter.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <label className="mb-2 block text-sm font-medium">
            CSE Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Operating Systems"
            className="mb-6 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
          />

          <label className="mb-2 block text-sm font-medium">
            Past Exam Questions
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={"Paste past exam questions here...\n\n2023 Final Exam\n1. Explain database normalization.\n2. Explain primary and foreign keys.\n\n2024 Final Exam\n1. Explain 1NF, 2NF and 3NF."}
            rows={10}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 leading-7 outline-none focus:border-violet-500"
          />

          <button
            onClick={analyzePapers}
            disabled={loading || questionText.trim().length < 30 || !subject.trim()}
            className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3.5 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing Papers..." : "✨ Analyze Papers"}
          </button>

          {loading && (
            <p className="mt-3 text-center text-sm text-slate-400">
              AI is identifying topics and preparing your study insights.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-900 bg-red-950 p-4 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>

        {analysis && (
          <section className="mt-10 space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <p className="mt-2 text-slate-400">{analysis.summary}</p>
            </div>

            {analysis.topics.map((topic, index) => (
              <article
                key={`${topic.name}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{topic.name}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      topic.category === "A"
                        ? "bg-red-950 text-red-300"
                        : topic.category === "B"
                          ? "bg-amber-950 text-amber-300"
                          : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    Priority {topic.category}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  Reported frequency: {topic.frequency} · Years:
                  {" "}{topic.years.length ? topic.years.join(", ") : "Not identified"}
                </p>

                <p className="mt-4 text-slate-300">{topic.reason}</p>

                <h4 className="mt-5 font-semibold text-violet-300">
                  Study Plan
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1 text-slate-300">
                  {topic.studyPlan.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>

                <h4 className="mt-5 font-semibold text-violet-300">
                  Practice Questions
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-2 text-slate-300">
                  {topic.practiceQuestions.map((question, i) => (
                    <li key={i}>{question}</li>
                  ))}
                </ul>

                <details className="mt-5 rounded-xl bg-slate-950 p-4">
                  <summary className="cursor-pointer font-medium">
                    View Model Answer
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-300">
                    {topic.modelAnswer}
                  </p>
                </details>
              </article>
            ))}

            <p className="text-sm text-slate-500">
              Historical priorities are study guidance, not predictions of
              future exam questions.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
