/**
 * usePdfChunker
 *
 * Renders each page of a PDF to a JPEG image entirely in the browser using
 * PDF.js (CDN-loaded in index.html). Groups pages into fixed-size batches so
 * each edge-function call stays well within Supabase's 150-second limit.
 *
 * WHY: Sending a raw 20–80 MB PDF to an edge function causes timeouts.
 * Sending 4-page JPEG batches (~300–800 KB each) takes ~10 s per call — safe.
 */
import { useState, useCallback } from "react";

declare const pdfjsLib: any;

export interface PageBatch {
  batchIndex: number;
  totalBatches: number;
  pages: string[];        // base64 JPEG strings (no "data:" prefix)
  sourceFile: string;
  folderCategory: string;
}

const PAGES_PER_BATCH = 4;
const RENDER_SCALE    = 1.5; // ~108 dpi — sharp text, reasonable payload size
const JPEG_QUALITY    = 0.82;

export function usePdfChunker() {
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkStatus, setChunkStatus]     = useState("");

  /**
   * Takes a raw PDF Blob, renders every page to JPEG via PDF.js,
   * and returns an array of batches (each ≤ PAGES_PER_BATCH images).
   */
  const chunkPdfBlob = useCallback(async (
    blob: Blob,
    filename: string,
    folderCategory: string,
  ): Promise<PageBatch[]> => {
    if (typeof pdfjsLib === "undefined") {
      throw new Error(
        "PDF.js is not loaded. Ensure the CDN script tags are present in index.html."
      );
    }

    setChunkStatus(`Loading ${filename}…`);
    setChunkProgress(0);

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
      allPageB64.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1]);

      // Free GPU memory immediately
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

  return { chunkPdfBlob, chunkProgress, chunkStatus };
}
