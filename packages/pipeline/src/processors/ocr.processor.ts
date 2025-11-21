import { MinioStorage } from "@doc-clf/storage";

// Import pdfjs-dist with Node.js compatibility
let pdfjsLib: any;
async function getPdfJs() {
  if (!pdfjsLib) {
    // @ts-ignore - pdfjs-dist types may not be available until package is installed
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLib;
}

interface OCRResult {
  rawText: string;
  confidence: number;
  pageCount: number;
}

export class OCRProcessor {
  constructor(private storage: MinioStorage) {}

  /**
   * Main OCR processing function
   * For text-based PDFs, extracts text directly using pdfjs-dist
   * For scanned PDFs, would use OCR (requires canvas - not implemented yet)
   */
  async process(documentId: string, objectKey: string): Promise<OCRResult> {
    console.log(`[OCR] Starting OCR for document ${documentId}`);

    // Step 1: Download PDF from MinIO
    const pdfBuffer = await this.downloadPDF(objectKey);
    console.log(`[OCR] Downloaded PDF (${pdfBuffer.length} bytes)`);

    // Step 2: Extract text from PDF using pdfjs-dist
    const pdfjs = await getPdfJs();

    // Convert Buffer to Uint8Array (pdfjs-dist requires Uint8Array)
    const pdfData = new Uint8Array(pdfBuffer);

    // Load PDF document
    const loadingTask = pdfjs.getDocument({
      data: pdfData,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // Extract text from each page
    const allText: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`[OCR] Extracting text from page ${pageNum}/${numPages}`);
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine all text items from the page
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      allText.push(pageText);
    }

    // Combine all pages
    const rawText = allText.join("\n\n--- Page Break ---\n\n");

    // For text-based PDFs, we assume 100% confidence since text is directly extracted
    // For scanned PDFs, this would be the OCR confidence score
    const confidence = 100;

    console.log(
      `[OCR] Completed. Extracted ${rawText.length} characters from ${numPages} page(s) with ${confidence}% confidence`
    );

    return {
      rawText,
      confidence,
      pageCount: numPages,
    };
  }

  /**
   * Download PDF from MinIO storage
   */
  private async downloadPDF(objectKey: string): Promise<Buffer> {
    const bucket = process.env.MINIO_BUCKET_ORIGINAL!;
    if (!bucket) {
      throw new Error("MINIO_BUCKET_ORIGINAL environment variable is not set");
    }
    return await this.storage.download(bucket, objectKey);
  }

  // Note: PDF to images and OCR methods removed for now
  // They will be re-implemented when canvas is properly set up for scanned PDFs
  // For now, we use pdf-parse which works for text-based PDFs
}
