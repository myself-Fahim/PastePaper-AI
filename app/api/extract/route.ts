import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

export const maxDuration = 300;
GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")).href;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "PDF must be 8 MB or smaller." }, { status: 400 });
    const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.filter((item) => "str" in item).map((item) => ("str" in item ? item.str : "")).join(" "));
      page.cleanup();
    }
    let text = pages.join("\n").trim();
    if (text.length < 30) {
      const worker = await createWorker("eng");
      try {
        const ocr: string[] = [];
        // Keep OCR bounded for very large uploads; exam papers normally need
        // only the first few pages and this prevents serverless timeouts.
        const pagesToProcess = Math.min(pdf.numPages, 12);
        for (let i = 1; i <= pagesToProcess; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
          ocr.push((await worker.recognize(canvas.toBuffer("image/png"))).data.text);
          page.cleanup();
        }
        text = ocr.join("\n").trim();
      } finally { await worker.terminate(); }
    }
    await loadingTask.destroy();
    if (text.length < 30) return NextResponse.json({ error: "Could not extract enough text from this PDF." }, { status: 400 });
    return NextResponse.json({ extractedText: text.slice(0, 20000) });
  } catch (error) {
    console.error("PDF extraction route error:", error);
    return NextResponse.json({ error: "Could not extract text from the PDF." }, { status: 500 });
  }
}
