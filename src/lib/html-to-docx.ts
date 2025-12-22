
// This file is now deprecated. Use tiptap-to-docx.ts for all DOCX export logic.
// This wrapper is provided for backward compatibility only.
import { tiptapJsonToDocx } from './tiptap-to-docx';
import type { Paragraph } from 'docx';

/**
 * Convert TipTap JSON content to docx Paragraph elements (wrapper for tiptap-to-docx)
 */
export function parseHtmlContent(json: any): Paragraph[] {
  // Accepts TipTap JSON, delegates to tiptap-to-docx
  return tiptapJsonToDocx(json);
}
