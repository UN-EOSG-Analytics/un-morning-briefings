/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert HTML content from TipTap editor to DOCX Paragraph elements.
 *
 * Uses a single DOM-based parser for both client and server.
 * On the client, native DOMParser is used; on the server, linkedom provides
 * a lightweight DOM implementation so the same code path runs everywhere.
 */
import {
  Paragraph,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  BorderStyle,
} from "docx";

// ─── Image helpers ──────────────────────────────────────────────────────────

function base64ToBuffer(dataUrl: string): Buffer {
  const base64String = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
  return Buffer.from(base64String, "base64");
}

function getImageType(dataUrl: string): "png" | "gif" | "jpg" | "bmp" {
  if (dataUrl.includes("image/png")) return "png";
  if (dataUrl.includes("image/gif")) return "gif";
  if (dataUrl.includes("image/bmp")) return "bmp";
  return "jpg";
}

function getPNGDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    if (buffer.length < 24) return null;
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== pngSignature[i]) return null;
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  } catch (error) {
    console.error("Error extracting PNG dimensions:", error);
  }
  return null;
}

function getJPEGDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    if (buffer.length < 2) return null;
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    let offset = 2;
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) return { width, height };
      }
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
      } else {
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }
  } catch (error) {
    console.error("Error extracting JPEG dimensions:", error);
  }
  return null;
}

function getGIFDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    if (buffer.length < 10) return null;
    const sig = buffer.slice(0, 6).toString("ascii");
    if (sig !== "GIF87a" && sig !== "GIF89a") return null;
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    if (width > 0 && height > 0) return { width, height };
  } catch (error) {
    console.error("Error extracting GIF dimensions:", error);
  }
  return null;
}

function getImageDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  return (
    getPNGDimensions(buffer) ??
    getJPEGDimensions(buffer) ??
    getGIFDimensions(buffer)
  );
}

function calculateImageDimensions(
  dataWidth: string | null,
  dataHeight: string | null,
  buffer?: Buffer,
  maxWidth: number = 500,
): { width: number; height: number } {
  let origWidth: number | undefined;
  let origHeight: number | undefined;

  if (buffer) {
    const dims = getImageDimensions(buffer);
    if (dims) {
      origWidth = dims.width;
      origHeight = dims.height;
    }
  }
  if (!origWidth && dataWidth) origWidth = parseInt(dataWidth);
  if (!origHeight && dataHeight) origHeight = parseInt(dataHeight);

  if (origWidth && origHeight && origWidth > 0 && origHeight > 0) {
    if (origWidth <= maxWidth) return { width: origWidth, height: origHeight };
    const aspectRatio = origWidth / origHeight;
    return { width: maxWidth, height: Math.round(maxWidth / aspectRatio) };
  }
  return { width: maxWidth, height: Math.round(maxWidth * 0.75) };
}

// ─── Universal DOM parser ───────────────────────────────────────────────────

/**
 * Get a DOMParser that works in both browser and Node.js.
 * On the server, uses linkedom for a lightweight DOM implementation.
 */
function getDOMParser(): { parseFromString(html: string, mime: string): Document } {
  if (typeof window !== "undefined") {
    return new DOMParser();
  }
  // Server-side: use linkedom
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseHTML } = require("linkedom");
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parseFromString(html: string, _mime: string): Document {
      const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
      return document;
    },
  };
}

// ─── Style types ────────────────────────────────────────────────────────────

interface TextStyles {
  bold?: boolean;
  italics?: boolean;
  underline?: object;
  strike?: boolean;
  highlight?: { type: "clear"; fill: string };
  color?: string;
  font?: string;
  subScript?: boolean;
  superScript?: boolean;
}

// ─── Inline run extraction (single code path) ──────────────────────────────

function extractTextRuns(element: Element, inherited: TextStyles = {}): any[] {
  const runs: any[] = [];

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      const text = (node as any).textContent;
      if (text) {
        const lines = text.split("\n");
        lines.forEach((line: string, index: number) => {
          if (line) {
            runs.push(
              new TextRun({
                text: line,
                font: inherited.font || "Roboto",
                bold: inherited.bold,
                italics: inherited.italics,
                underline: inherited.underline,
                strike: inherited.strike,
                shading: inherited.highlight,
                color: inherited.color,
                subScript: inherited.subScript,
                superScript: inherited.superScript,
              }),
            );
          }
          if (index < lines.length - 1) {
            runs.push(new TextRun({ text: "", break: 1 }));
          }
        });
      }
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1 }));
        continue;
      }

      if (tag === "img") {
        const src = el.getAttribute("src");
        if (src && src.startsWith("data:image")) {
          try {
            const buffer = base64ToBuffer(src);
            const dataWidth = el.getAttribute("data-width");
            const dataHeight = el.getAttribute("data-height");
            const dims = calculateImageDimensions(
              dataWidth,
              dataHeight,
              buffer,
              300,
            );
            const imageType = getImageType(src);
            runs.push(
              new ImageRun({
                data: buffer as unknown as Uint8Array,
                type: imageType,
                transformation: { width: dims.width, height: dims.height },
              }),
            );
          } catch (error) {
            console.error("Error processing inline image:", error);
          }
        }
        continue;
      }

      // Handle <a> tags as clickable hyperlinks
      if (tag === "a") {
        const href = el.getAttribute("href");
        const linkStyles: TextStyles = {
          ...inherited,
          color: "0563C1",
          underline: inherited.underline ?? {},
        };
        const childRuns = extractTextRuns(el, linkStyles);
        if (href) {
          const textRuns = childRuns.filter(
            (r: any): r is TextRun => r instanceof TextRun,
          );
          if (textRuns.length > 0) {
            runs.push(
              new ExternalHyperlink({ link: href, children: textRuns }),
            );
          } else {
            runs.push(...childRuns);
          }
        } else {
          runs.push(...childRuns);
        }
        continue;
      }

      // Accumulate styles for inline formatting tags, then recurse
      const styles: TextStyles = { ...inherited };
      switch (tag) {
        case "strong":
        case "b":
          styles.bold = true;
          break;
        case "em":
        case "i":
          styles.italics = true;
          break;
        case "u":
          styles.underline = styles.underline ?? {};
          break;
        case "s":
        case "del":
          styles.strike = true;
          break;
        case "mark":
          styles.highlight = { type: "clear", fill: "FFFF00" };
          break;
        case "code":
          // font stays Roboto
          break;
        case "sub":
          styles.subScript = true;
          break;
        case "sup":
          styles.superScript = true;
          break;
      }

      runs.push(...extractTextRuns(el, styles));
    }
  }

  return runs;
}

// ─── Block-level HTML → Paragraphs (single code path) ──────────────────────

function parseHtmlToParagraphs(
  html: string,
  baseStyles?: TextStyles,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const parser = getDOMParser();
  const doc = parser.parseFromString(html, "text/html");

  for (const element of Array.from(doc.body.children)) {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "p") {
      const children = extractTextRuns(element, baseStyles);
      if (children.length > 0) {
        paragraphs.push(
          new Paragraph({
            children,
            spacing: { after: 100 },
          }),
        );
      } else if (
        !element.textContent?.trim() &&
        element.innerHTML.includes("<br")
      ) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            spacing: { after: 100 },
          }),
        );
      } else if (element.textContent?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: element.textContent, font: "Roboto" }),
            ],
            spacing: { after: 100 },
          }),
        );
      }
    } else if (["h1", "h2", "h3"].includes(tagName)) {
      const children = extractTextRuns(element, baseStyles);
      paragraphs.push(
        new Paragraph({
          children:
            children.length > 0
              ? children
              : [
                  new TextRun({
                    text: element.textContent || "",
                    bold: true,
                    font: "Roboto",
                  }),
                ],
          spacing: { before: 100, after: 150 },
        }),
      );
    } else if (tagName === "ul") {
      const items = Array.from(element.querySelectorAll(":scope > li"));
      items.forEach((item) => {
        const children = extractTextRuns(item, baseStyles);
        const bulletRun = new TextRun({ text: "•\t", font: "Roboto" });
        paragraphs.push(
          new Paragraph({
            children:
              children.length > 0
                ? [bulletRun, ...children]
                : [
                    bulletRun,
                    new TextRun({
                      text: item.textContent || "",
                      font: "Roboto",
                    }),
                  ],
            indent: { left: 400, hanging: 400 },
            spacing: { after: 80 },
          }),
        );
      });
    } else if (tagName === "ol") {
      const items = Array.from(element.querySelectorAll(":scope > li"));
      items.forEach((item, idx) => {
        const children = extractTextRuns(item, baseStyles);
        const numberRun = new TextRun({
          text: `${idx + 1}. `,
          font: "Roboto",
        });
        paragraphs.push(
          new Paragraph({
            children:
              children.length > 0
                ? [numberRun, ...children]
                : [
                    numberRun,
                    new TextRun({
                      text: item.textContent || "",
                      font: "Roboto",
                    }),
                  ],
            spacing: { after: 50 },
          }),
        );
      });
    } else if (tagName === "blockquote") {
      const children = extractTextRuns(element, baseStyles);
      paragraphs.push(
        new Paragraph({
          children:
            children.length > 0
              ? children
              : [
                  new TextRun({
                    text: element.textContent || "",
                    italics: true,
                    font: "Roboto",
                  }),
                ],
          border: {
            left: {
              color: "009edb",
              space: 100,
              style: "single",
              size: 12,
            },
          },
          spacing: { after: 100 },
        }),
      );
    } else if (tagName === "pre") {
      const lines = (element.textContent ?? "").split("\n");
      const preRuns: TextRun[] = [];
      lines.forEach((line, idx) => {
        preRuns.push(new TextRun({ text: line, font: "Roboto", size: 18 }));
        if (idx < lines.length - 1) {
          preRuns.push(new TextRun({ text: "", break: 1 }));
        }
      });
      paragraphs.push(
        new Paragraph({
          children: preRuns,
          shading: { fill: "E7E6E6" },
          spacing: { after: 100 },
        }),
      );
    } else if (tagName === "hr") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          border: {
            bottom: {
              color: "CCCCCC",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { after: 100 },
        }),
      );
    } else if (tagName === "img") {
      const src = element.getAttribute("src");
      const alt = element.getAttribute("alt") || "Image";
      const dataWidth = element.getAttribute("data-width");
      const dataHeight = element.getAttribute("data-height");

      if (src) {
        try {
          if (src.startsWith("data:image")) {
            const buffer = base64ToBuffer(src);
            const dims = calculateImageDimensions(
              dataWidth,
              dataHeight,
              buffer,
              500,
            );
            const imageType = getImageType(src);
            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: buffer as unknown as Uint8Array,
                    type: imageType,
                    transformation: {
                      width: dims.width,
                      height: dims.height,
                    },
                  }),
                ],
                spacing: { after: 100 },
              }),
            );
          } else {
            console.warn(
              "Image src is not a data URL:",
              src.substring(0, 50),
            );
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Image: ${alt}]`,
                    color: "0563C1",
                    underline: {},
                    font: "Roboto",
                  }),
                ],
                spacing: { after: 100 },
              }),
            );
          }
        } catch (error) {
          console.error("Error processing image:", error);
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Image: ${alt}]`,
                  color: "0563C1",
                  underline: {},
                  font: "Roboto",
                }),
              ],
              spacing: { after: 100 },
            }),
          );
        }
      }
    }
  }

  return paragraphs;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert HTML content (from TipTap getHTML()) to docx Paragraph elements.
 * Works identically on client and server.
 */
export function parseHtmlContent(
  html: string,
  baseStyles?: TextStyles,
): Paragraph[] {
  if (!html || typeof html !== "string" || html.trim() === "") {
    return [];
  }
  return parseHtmlToParagraphs(html, baseStyles);
}

/**
 * Parse HTML and return the runs of the first paragraph plus any remaining paragraphs.
 * Use this when you need to prepend a custom run (e.g. "PU Note: ") to the first paragraph.
 */
export function parseHtmlFirstParagraphRuns(
  html: string,
  baseStyles?: TextStyles,
): { runs: any[]; remainingParagraphs: Paragraph[] } {
  if (!html || typeof html !== "string" || html.trim() === "") {
    return { runs: [], remainingParagraphs: [] };
  }

  const parser = getDOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = Array.from(doc.body.children);
  if (elements.length === 0) return { runs: [], remainingParagraphs: [] };

  const runs = extractTextRuns(elements[0], baseStyles);
  const remainingParagraphs =
    elements.length > 1
      ? parseHtmlToParagraphs(
          elements
            .slice(1)
            .map((e) => e.outerHTML)
            .join(""),
          baseStyles,
        )
      : [];
  return { runs, remainingParagraphs };
}
