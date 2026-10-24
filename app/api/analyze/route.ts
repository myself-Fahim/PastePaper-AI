
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import {
    GlobalWorkerOptions,
    getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";

// Scanned PDFs require OCR before the AI request. Allow enough time on
// deployments that support extended Vercel function durations.
export const maxDuration = 300;

// This route always runs on Node. PDF.js otherwise uses its browser default
// (`./pdf.worker.mjs`), which Next tries to resolve from its generated chunks.
// Point it at the worker shipped in node_modules instead.
GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(
        process.cwd(),
        "node_modules",
        "pdfjs-dist",
        "legacy",
        "build",
        "pdf.worker.mjs"
    )
).href;

function subjectMatchesMaterial(subject: string, material: string): boolean {
    const stopWords = new Set(["and", "the", "of", "for", "in", "on", "to"]);
    const subjectWords = subject.toLowerCase().match(/[a-z0-9]+/g)?.filter(
        (word) => word.length > 2 && !stopWords.has(word)
    ) ?? [];
    const materialWords = new Set(material.toLowerCase().match(/[a-z0-9]+/g) ?? []);

    if (subjectWords.length === 0) return false;
    const matchedWords = subjectWords.filter((word) => materialWords.has(word));
    return matchedWords.length / subjectWords.length >= 0.5;
}

// Extract selectable text from a PDF buffer
async function extractPdfText(buffer: Buffer): Promise<string> {
    const loadingTask = getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
    });

    const pages: string[] = [];

    try {
        const pdfDocument = await loadingTask.promise;

        for (
            let pageNumber = 1;
            pageNumber <= pdfDocument.numPages;
            pageNumber++
        ) {
            const page = await pdfDocument.getPage(pageNumber);

            try {
                const content = await page.getTextContent();

                const pageText = content.items
                    .filter((item) => "str" in item)
                    .map((item) => ("str" in item ? item.str : ""))
                    .join(" ");

                pages.push(pageText);
            } finally {
                page.cleanup();
            }
        }

        const text = pages.join("\n").trim();

        // Scanned PDFs have no text layer. Render those pages and OCR them.
        if (text.length >= 30) return text;

        const worker = await createWorker("eng");
        try {
            const ocrPages: string[] = [];
            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = createCanvas(
                    Math.ceil(viewport.width),
                    Math.ceil(viewport.height)
                );

                await page.render({
                    canvas: canvas as never,
                    canvasContext: canvas.getContext("2d") as never,
                    viewport,
                }).promise;

                const result = await worker.recognize(canvas.toBuffer("image/png"));
                ocrPages.push(result.data.text);
                page.cleanup();
            }

            return ocrPages.join("\n").trim();
        } finally {
            await worker.terminate();
        }
    } catch (error) {
        console.error("PDF text extraction error:", error);
        throw new Error("Failed to extract text from the uploaded PDF.");
    } finally {
        await loadingTask.destroy();
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const subject = formData.get("subject");
        const questionText = formData.get("questionText");
        const uploadedFile = formData.get("file");

        if (typeof subject !== "string" || !subject.trim()) {
            return NextResponse.json(
                { error: "Please provide a subject." },
                { status: 400 }
            );
        }

        let extractedText = "";

        // 1. Extract text from uploaded PDF
        if (uploadedFile instanceof File && uploadedFile.size > 0) {
            if (uploadedFile.size > 8 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "PDF must be 8 MB or smaller." },
                    { status: 400 }
                );
            }

            if (
                uploadedFile.type !== "application/pdf" &&
                !uploadedFile.name.toLowerCase().endsWith(".pdf")
            ) {
                return NextResponse.json(
                    { error: "Please upload a PDF file." },
                    { status: 400 }
                );
            }

            const buffer = Buffer.from(
                await uploadedFile.arrayBuffer()
            );

            extractedText = await extractPdfText(buffer);

            if (extractedText.length < 30) {
                return NextResponse.json(
                    {
                        error:
                            "Could not extract enough text from this PDF. It may be scanned or image-only. Try a text-based PDF.",
                    },
                    { status: 400 }
                );
            }
        } else if (typeof questionText === "string") {
            // 2. Use pasted text when no PDF is uploaded
            extractedText = questionText.trim();
        }

        if (extractedText.length < 30) {
            return NextResponse.json(
                {
                    error:
                        "Please upload a readable PDF or paste at least 30 characters of questions.",
                },
                { status: 400 }
            );
        }

        if (!subjectMatchesMaterial(subject, extractedText)) {
            return NextResponse.json(
                {
                    error: `The subject "${subject.trim()}" does not match the uploaded exam material. Please enter the correct subject.`,
                },
                { status: 400 }
            );
        }

        // 3. Ollama Cloud configuration
        const apiKey = process.env.OLLAMA_API_KEY;
        const model = process.env.OLLAMA_MODEL;

        if (!apiKey || !model) {
            return NextResponse.json(
                { error: "Ollama API configuration is missing." },
                { status: 500 }
            );
        }

        // 4. AI prompt
        const prompt = `
You are PastPaper AI, an academic exam-preparation assistant.

Subject: ${subject.trim()}

Extracted past exam questions:
${extractedText.slice(0, 20000)}

Your job is to produce a careful, detailed, exam-focused analysis. Analyze only the supplied evidence; do not use general assumptions to claim that a topic appeared in the papers.

Return a JSON object:
{
  "summary": "A detailed 2-4 sentence summary of the exam pattern, recurring concepts, question style, and the most important preparation priorities",
  "topics": [
    {
      "name": "Topic name",
      "frequency": 1,
      "years": [],
      "category": "A",
      "reason": "A detailed evidence-based explanation referencing the observed question patterns and, when available, years or repetitions",
      "studyPlan": ["Specific concept to learn", "Specific application or comparison to practice", "Specific revision or self-test task"],
      "practiceQuestions": ["A clear exam-style question", "A harder application or comparison question"],
      "modelAnswer": "A well-structured exam-ready answer with a definition or introduction, key points, examples or steps where appropriate, and a concise conclusion",
      "explanationModes": {
        "beginner": "A thorough beginner-friendly explanation that starts with the basic idea, defines unfamiliar terms in plain language, explains how and why it works step by step, and includes an easy everyday or subject-specific example",
        "examReady": "A moderately elaborate, technically accurate exam answer with an introduction or definition, organized key points, explanation of how it works, relevant examples, comparisons or steps where appropriate, and a concise conclusion",
        "oneMinute": "A compact high-yield revision summary containing only the essential points",
        "memoryTrick": "A memorable mnemonic, analogy, or association that helps recall the topic"
      },
      "resources": [{"title": "Resource title", "url": "https://...", "source": "Official documentation or reputable educational source"}]
    }
  ]
}

Rules:
- Include only topics, concepts, and question patterns supported by the supplied questions.
- Group closely related questions under a precise topic instead of creating many duplicate topics.
- Count frequency only when the same topic clearly appears more than once; otherwise use 1.
- List a year only when it is explicitly present in the supplied material; otherwise return an empty array.
- Category A means the strongest historical evidence or repetition, B means moderate evidence, and C means limited evidence. Do not treat categories as predictions or guarantees.
- Prioritize accuracy over filling every field. If evidence is weak, say so in the reason.
- Make every study-plan step actionable and specific to the subject.
- Make model answers technically accurate, organized with headings or numbered points when useful, and detailed enough for exam preparation without inventing facts absent from the question.
- Generate all four explanation modes for every topic. Make the beginner explanation patient and educational rather than merely short: assume the student has little prior knowledge, define terms, build the idea step by step, and include an easy example. Make the exam-ready answer moderately elaborate and structured enough for a strong written response, but avoid unnecessary padding. Keep the one-minute revision concise, and make the memory trick genuinely memorable and technically correct.
- Add 2-3 genuinely relevant learning resources for each topic. Prefer official documentation, university resources, reputable educational sites, or well-known reference material. Never invent a URL; if no reliable direct URL is known, return an empty resources array.
- Keep frequency numeric and all years as strings.
- Return valid JSON only, without Markdown code fences or additional commentary.
- Do not place literal line breaks inside JSON string values; use spaces or escaped newline characters instead.
`;

        // 5. Call Ollama Cloud
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
                                    : "AI analysis failed. Check the server terminal.",
                },
                { status: 502 }
            );
        }

        // 6. Parse AI response
        const data = await response.json();
        const content = data?.message?.content;

        if (typeof content !== "string" || !content.trim()) {
            return NextResponse.json(
                { error: "AI returned an empty response." },
                { status: 502 }
            );
        }

        const cleanedContent = content
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/, "")
            .trim();

        // Some models add a short explanation or trailing commas even when
        // JSON mode is enabled. Keep the parser tolerant without changing the
        // response contract used by the frontend.
        const jsonStart = cleanedContent.indexOf("{");
        const jsonEnd = cleanedContent.lastIndexOf("}");
        const jsonCandidate = jsonStart >= 0 && jsonEnd > jsonStart
            ? cleanedContent.slice(jsonStart, jsonEnd + 1)
            : cleanedContent;
        const normalizedJson = jsonCandidate.replace(/,\s*([}\]])/g, "$1");

        let analysis: unknown;

        try {
            analysis = JSON.parse(normalizedJson);
        } catch {
            const start = normalizedJson.indexOf("{");
            const end = normalizedJson.lastIndexOf("}");

            if (start === -1 || end <= start) {
                console.error("Invalid AI JSON:", content);

                return NextResponse.json(
                    { error: "AI returned invalid JSON. Please try again." },
                    { status: 502 }
                );
            }

            try {
                analysis = JSON.parse(
                    normalizedJson.slice(start, end + 1)
                );
            } catch {
                return NextResponse.json(
                    { error: "AI returned malformed JSON. Please try again." },
                    { status: 502 }
                );
            }
        }

        if (
            typeof analysis !== "object" ||
            analysis === null ||
            !("topics" in analysis) ||
            !Array.isArray(analysis.topics) ||
            !("summary" in analysis) ||
            typeof analysis.summary !== "string"
        ) {
            return NextResponse.json(
                { error: "AI returned an unexpected analysis format." },
                { status: 502 }
            );
        }

        return NextResponse.json({
            analysis,
            extractedText: extractedText.slice(0, 20000),
        });
    } catch (error) {
        console.error("Analysis route error:", error);

        if (
            error instanceof Error &&
            (error.name === "TimeoutError" ||
                error.name === "AbortError")
        ) {
            return NextResponse.json(
                { error: "AI request timed out. Please try again." },
                { status: 504 }
            );
        }

        return NextResponse.json(
            {
                error:
                    "Could not process the PDF or analyze the questions. Check the server terminal.",
            },
            { status: 500 }
        );
    }
}
