import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

//  Extract text from PDF buffer 
const extractFromPDF = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";

  // loop through every page and extract text
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
};

//  Extract text from DOCX buffer 
const extractFromDOCX = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

//  Main extract function 
export const extractText = async (buffer, mimetype) => {
  const extractors = {
    "application/pdf": extractFromPDF,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": extractFromDOCX,
  };

  const extractor = extractors[mimetype];

  if (!extractor) {
    const err = new Error("Unsupported file type — only PDF and DOCX allowed");
    err.status = 400;
    throw err;
  }

  const text = await extractor(buffer);

  if (!text || text.trim().length < 50) {
    const err = new Error("Could not extract text — make sure the file is not scanned or image-based");
    err.status = 422;
    throw err;
  }

  return text.trim();
};