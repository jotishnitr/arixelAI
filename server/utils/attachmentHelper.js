const pdfModule = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extracts raw text from an attachment (PDF, Word, or plain text).
 * Compatible with pdf-parse v2 (class-based) and v1 (function-based).
 *
 * @param {Object} attachment - { name, mimeType, base64 }
 * @returns {Promise<string>} - Extracted text or empty string if unparseable
 */
async function extractAttachmentText(attachment) {
  if (!attachment || !attachment.base64) return "";

  const mime = (attachment.mimeType || "").toLowerCase();
  const filename = (attachment.name || "").toLowerCase();

  try {
    // Strip data URI scheme prefix if present
    const cleanBase64 = attachment.base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // 1. PDF Documents
    if (mime.includes("pdf") || filename.endsWith(".pdf")) {
      let extractedText = "";

      // pdf-parse v2.x exports { PDFParse } class
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const res = await parser.getText();
        extractedText = res?.text || "";
      }
      // pdf-parse v1.x exports a function
      else if (typeof pdfModule === "function") {
        const res = await pdfModule(buffer);
        extractedText = res?.text || "";
      }
      // Fallback for default export
      else if (pdfModule.default) {
        if (typeof pdfModule.default === "function") {
          const res = await pdfModule.default(buffer);
          extractedText = res?.text || "";
        } else if (pdfModule.default.PDFParse) {
          const parser = new pdfModule.default.PDFParse({ data: buffer });
          const res = await parser.getText();
          extractedText = res?.text || "";
        }
      }

      if (extractedText && extractedText.trim()) {
        console.log(`[attachmentHelper] Successfully parsed PDF (${attachment.name || "document"}): ${extractedText.length} characters extracted.`);
        return extractedText.trim();
      }
    }

    // 2. Microsoft Word Documents (.docx)
    if (
      mime.includes("wordprocessingml") ||
      mime.includes("docx") ||
      filename.endsWith(".docx")
    ) {
      const docResult = await mammoth.extractRawText({ buffer });
      if (docResult && docResult.value) {
        console.log(`[attachmentHelper] Successfully parsed Word doc (${attachment.name || "document"}): ${docResult.value.length} characters extracted.`);
        return docResult.value.trim();
      }
    }

    // 3. Plain text, Markdown, JSON, Code, CSV
    if (
      mime.startsWith("text/") ||
      mime.includes("json") ||
      mime.includes("javascript") ||
      mime.includes("csv") ||
      filename.endsWith(".txt") ||
      filename.endsWith(".md") ||
      filename.endsWith(".json") ||
      filename.endsWith(".csv") ||
      filename.endsWith(".py") ||
      filename.endsWith(".js")
    ) {
      const text = buffer.toString("utf-8");
      return text.trim();
    }
  } catch (err) {
    console.warn(`[attachmentHelper] Failed to extract text from attachment (${attachment.name || "file"}):`, err.message);
  }

  return "";
}

/**
 * Sanitizes an attachment before storing it in MongoDB.
 * MongoDB enforces a strict 16MB document limit (16,793,600 bytes) across the entire Chat document.
 *
 * - Non-images (PDF, Word, Code, Text): NEVER store the base64 string in DB.
 *   The extracted content has already been injected into the conversation prompt,
 *   and the frontend UI only needs the filename and file icon.
 * - Images (image/*): Only preserve base64 if small (< 500KB) for rendering previews
 *   in chat history. If larger, omit base64 so documents never exceed the 16MB ceiling.
 *
 * @param {Object} attachment - { name, mimeType, base64 }
 * @returns {Object|undefined} - Sanitized attachment object for MongoDB
 */
function sanitizeAttachmentForDb(attachment) {
  if (!attachment) return undefined;

  const mime = (attachment.mimeType || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  // 500 KB limit for inline base64 stored in MongoDB
  const isSmallImage = isImage && attachment.base64 && attachment.base64.length < 500000;

  return {
    name: attachment.name || "Attachment",
    mimeType: attachment.mimeType || (isImage ? "image/png" : "application/octet-stream"),
    ...(isSmallImage ? { base64: attachment.base64 } : {}),
  };
}

module.exports = {
  extractAttachmentText,
  sanitizeAttachmentForDb,
};
