/**
 * usePdfChunker
 *
 * Renders each page of a PDF to a JPEG image entirely in the browser using
 * PDF.js — loaded dynamically on first use, no index.html changes needed.
 *
 * WHY: Sending a raw 20–80 MB PDF to an edge function causes Supabase timeouts.
 * Sending 4-page JPEG batches (~300–800 KB each) takes ~10 s per call — safe.
 */
import { useState, useCallback, useRef } from "react";

export interface PageBatch {
  batchIndex: number;
  totalBatches: number;
  pages: string[];        // base64 JPEG strings (no "data:" prefix)
  sourceFile: string;
  folderCategory: string;
}

const PDFJS_CDN    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_CDN   = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const PAGES_PER_BATCH = 4;
const RENDER_SCALE    = 1.5;   // ~108 dpi — sharp text, reasonable payload
const JPEG_QUALITY    = 0.82;

/** Loads PDF.js from CDN exactly once and resolves with the pdfjsLib global. */
function loadPdfJs(): Promise<any> {
  // Already loaded
  if (typeof (window as any).pdfjsLib !== "undefined") {
    return Promise.resolve((window as any).pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PDFJS_CDN}"]`);
    if (existing) {
      // Script tag exists but may still be loading — poll until ready
      const poll = setInterval(() => {
        if (typeof (window as any).pdfjsLib !== "undefined") {
          clearInterval(poll);
          configureWorker((window as any).pdfjsLib);
          resolve((window as any).pdfjsLib);
        }
      }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("PDF.js load timeout")); }, 15000);
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.async = true;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { reject(new Error("PDF.js loaded but pdfjsLib is undefined")); return; }
      configureWorker(lib);
      resolve(lib);
    };
    script.onerror = () => reject(new Error(`Failed to load PDF.js from CDN: ${PDFJS_CDN}`));
    document.head.appendChild(script);
  });
}

function configureWorker(lib: any) {
  if (!lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
  }
}

export function usePdfChunker() {
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkStatus, setChunkStatus]     = useState("");
  // Cache the loaded lib across renders
  const pdfLibRef = useRef<any>(null);

  /**
   * Downloads a PDF Blob, renders every page to JPEG, returns batches.
   *
   * @param blob           Raw PDF blob (already fetched from Google Drive)
   * @param filename       Original filename (for log messages)
   * @param folderCategory Drive subfolder context: "Brochure", "Floor Plans", …
   */
  const chunkPdfBlob = useCallback(async (
    blob: Blob,
    filename: string,
    folderCategory: string,
  ): Promise<PageBatch[]> => {
    setChunkStatus(`Initialising PDF renderer…`);
    setChunkProgress(0);

    // Lazy-load PDF.js on first call
    if (!pdfLibRef.current) {
      pdfLibRef.current = await loadPdfJs();
    }
    const pdfjsLib = pdfLibRef.current;

    setChunkStatus(`Loading ${filename}…`);

    const arrayBuffer = await blob.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages  = pdf.numPages;
    const allPageB64: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setChunkStatus(`Rendering ${filename} — page ${pageNum} of ${totalPages}`);
      setChunkProgress(Math.round((pageNum / totalPages) * 100));

      const page     = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas   = document.createElement("canvas");
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      const ctx      = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Strip the "data:image/jpeg;base64," prefix — edge function wants raw b64
      allPageB64.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1]);

      // Free GPU memory immediately to avoid OOM on large brochures
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    const totalBatches = Math.ceil(totalPages / PAGES_PER_BATCH);
    return Array.from({ length: totalBatches }, (_, i) => ({
      batchIndex:   i,
      totalBatches,
      pages:        allPageB64.slice(i * PAGES_PER_BATCH, (i + 1) * PAGES_PER_BATCH),
      sourceFile:   filename,
      folderCategory,
    }));
  }, []);

  /**
   * Extracts plain text from a PDF Blob using PDF.js getTextContent().
   * Much faster and cheaper than rendering to JPEG for vision — works great
   * for InDesign/Illustrator PDFs with real text layers.
   *
   * @param blob     Raw PDF blob
   * @param filename Original filename (for status display)
   * @returns        Combined text from all pages, separated by page markers
   */
  const extractPdfText = useCallback(async (
    blob: Blob,
    filename: string,
  ): Promise<string> => {
    setChunkStatus(`Initialising PDF text extractor…`);
    setChunkProgress(0);

    // Lazy-load PDF.js on first call
    if (!pdfLibRef.current) {
      pdfLibRef.current = await loadPdfJs();
    }
    const pdfjsLib = pdfLibRef.current;

    setChunkStatus(`Loading ${filename}…`);

    const arrayBuffer = await blob.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages  = pdf.numPages;
    const allText: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setChunkStatus(`Extracting text — ${filename} page ${pageNum}/${totalPages}`);
      setChunkProgress(Math.round((pageNum / totalPages) * 100));

      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      // Join text items, preserving line breaks when Y position changes
      let lastY: number | null = null;
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5]; // Y position
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        pageText += textItem.str;
        lastY = y;
      }

      if (pageText.trim()) {
        allText.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
      }
      page.cleanup();
    }

    setChunkProgress(100);
    setChunkStatus(`Done — extracted ${allText.length} pages of text from ${filename}`);
    return allText.join("\n\n");
  }, []);

  return { chunkPdfBlob, extractPdfText, chunkProgress, chunkStatus };
}
