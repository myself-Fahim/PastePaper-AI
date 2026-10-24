
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import {
    GlobalWorkerOptions,
    getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";

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

Analyze only the supplied evidence.

Return a JSON object:
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
- Category A means higher historical priority, B medium, C lower.
- These categories do not guarantee future exam questions.
- Explain when evidence is insufficient.
- Return valid JSON only, without Markdown code fences.
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

        let analysis: unknown;

        try {
            analysis = JSON.parse(cleanedContent);
        } catch {
            const start = cleanedContent.indexOf("{");
            const end = cleanedContent.lastIndexOf("}");

            if (start === -1 || end <= start) {
                console.error("Invalid AI JSON:", content);

                return NextResponse.json(
                    { error: "AI returned invalid JSON. Please try again." },
                    { status: 502 }
                );
            }

            try {
                analysis = JSON.parse(
                    cleanedContent.slice(start, end + 1)
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
