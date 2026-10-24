import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { subject, sourceText } = await request.json();
    if (typeof subject !== "string" || typeof sourceText !== "string" || sourceText.trim().length < 30) {
      return NextResponse.json({ error: "Provide a subject and exam material first." }, { status: 400 });
    }
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL;
    if (!apiKey || !model) return NextResponse.json({ error: "Ollama API configuration is missing." }, { status: 500 });
    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false, format: "json", options: { temperature: 0.3 }, messages: [{ role: "user", content: `Create a practice quiz for ${subject} from these past exam questions. Return JSON only in this shape: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. Generate 10 questions, mixing MCQs and short-answer questions. For short-answer questions, use options as an empty array and answer as the ideal answer string. Make every question specific to ${subject}.\n\n${sourceText.slice(0, 20000)}` }] }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) return NextResponse.json({ error: "Practice quiz generation failed." }, { status: 502 });
    const data = await response.json();
    const content = data?.message?.content;
    const cleaned = typeof content === "string" ? content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") : "";
    const quiz = JSON.parse(cleaned);
    if (!quiz || !Array.isArray(quiz.questions)) throw new Error("Invalid quiz format");
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Practice route error:", error);
    return NextResponse.json({ error: "Could not generate the practice quiz." }, { status: 500 });
  }
}
