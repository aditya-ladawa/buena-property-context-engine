import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export type ExtractedPdfText = {
  text: string;
  pageCount: number;
};

export async function extractPdfText(filePath: string): Promise<ExtractedPdfText> {
  const parser = new PDFParse({ data: await readFile(filePath) });
  try {
    const result = await parser.getText();
    return {
      text: result.text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim(),
      pageCount: result.total,
    };
  } finally {
    await parser.destroy();
  }
}
