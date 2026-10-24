
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Read request body
    const { subject, questionText } = await request.json();

    // 2. Validate input
    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof questionText !== "string" ||
      questionText.trim().length < 30
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a subject and at least 30 characters of questions.",
        },
        { status: 400 }
      );
    }

    // 3. Get Ollama configuration
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL;

    if (!apiKey || !model) {
      console.error("Missing Ollama environment variables.");

      return NextResponse.json(
        { error: "Ollama API configuration is missing." },
        { status: 500 }
      );
    }

    // 4. Prepare AI prompt
    const prompt = `
You are PastPaper AI, an academic exam-preparation assistant.

Subject: ${subject.trim()}

Past exam questions:
${questionText.trim().slice(0, 20000)}

Analyze only the supplied evidence.

Return a JSON object with this structure:
{
  "summary": "Brief analysis summary",
  "topics": [
    {
      "name": "Topic name",
      "frequency": 1,
      "years": [],
      "category": "A",
      "reason": "Evidence-based explanation",
      "studyPlan": ["Step 1", "Step 2"],
      "practiceQuestions": ["Question 1"],
      "modelAnswer": "Concise answer"
    }
  ]
}

Rules:
- Include only topics supported by the supplied questions.
- Do not invent years or unsupported frequency counts.
- Count frequency based on identifiable occurrences in the supplied papers.
- Category A means higher historical priority, B medium, C lower.
- These categories do not guarantee future exam questions.
- If evidence is insufficient, explain that limitation.
- Return JSON only, without Markdown code fences.
`;

    // 5. Call Ollama Cloud API
    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: "json",
        options: { temperature: 0.1 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });

    // 6. Handle Ollama API errors
    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Ollama API error:",
        response.status,
        details
      );

      return NextResponse.json(
        {
          error:
            response.status === 401
              ? "Ollama authentication failed. Check your API key."
              : response.status === 404
                ? "Ollama model not found. Check OLLAMA_MODEL."
                : response.status === 429
                  ? "Ollama rate limit reached. Please try again later."
                  : "AI analysis failed. Check the server terminal for details.",
        },
        { status: 502 }
      );
    }

    // 7. Read Ollama response
    const data = await response.json();
    const content = data?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      console.error("Empty or invalid Ollama response:", data);

      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    // 8. Remove optional Markdown code fences
    const cleanedContent = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    // 9. Parse AI-generated JSON safely
    let analysis: unknown;

    try {
      analysis = JSON.parse(cleanedContent);
    } catch {
      // Fallback if the model adds text around the JSON object
      const start = cleanedContent.indexOf("{");
      const end = cleanedContent.lastIndexOf("}");

      if (start === -1 || end <= start) {
        console.error("Invalid AI response:", content);

        return NextResponse.json(
          {
            error:
              "AI returned invalid JSON. Please try analyzing again.",
          },
          { status: 502 }
        );
      }

      try {
        analysis = JSON.parse(
          cleanedContent.slice(start, end + 1)
        );
      } catch {
        console.error("Could not parse AI response:", content);

        return NextResponse.json(
          {
            error:
              "AI returned malformed JSON. Please try again.",
          },
          { status: 502 }
        );
      }
    }

    // 10. Validate the analysis structure
    if (
      typeof analysis !== "object" ||
      analysis === null ||
      !("topics" in analysis) ||
      !Array.isArray(analysis.topics) ||
      !("summary" in analysis) ||
      typeof analysis.summary !== "string"
    ) {
      console.error("Unexpected analysis structure:", analysis);

      return NextResponse.json(
        {
          error:
            "AI returned an unexpected analysis format. Please try again.",
        },
        { status: 502 }
      );
    }

    // 11. Return successful analysis
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis route error:", error);

    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      return NextResponse.json(
        { error: "AI request timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Could not analyze the questions. Please try again." },
      { status: 500 }
    );
  }
}
