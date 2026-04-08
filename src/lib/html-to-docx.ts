/* eslint-disable @typescript-eslint/no-explicit-any */

// Convert HTML content from TipTap editor to DOCX Paragraph elements
import {
  Paragraph,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  BorderStyle,
} from "docx";

/**
 * Convert base64 data URL to Buffer for image embedding
 * @param dataUrl - Data URL starting with data:image/...;base64,
 * @returns Buffer containing the image data
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const base64String = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
  return Buffer.from(base64String, "base64");
}

/**
 * Detect image type from data URL or buffer
 */
function getImageType(dataUrl: string): "png" | "gif" | "jpg" | "bmp" {
  if (dataUrl.includes("image/png")) return "png";
  if (dataUrl.includes("image/gif")) return "gif";
  if (dataUrl.includes("image/bmp")) return "bmp";
  // Default to jpg for jpeg, jpg, or unknown
  return "jpg";
}

/**
 * Extract dimensions from PNG image data
 * PNG header format: bytes 16-20 contain width (big-endian), bytes 20-24 contain height (big-endian)
 * @param buffer - Buffer containing PNG image data
 * @returns Object with width and height, or null if cannot be determined
 */
function getPNGDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    // PNG signature is 8 bytes, then IHDR chunk follows
    // IHDR chunk: 4 bytes length + 4 bytes "IHDR" + 4 bytes width + 4 bytes height
    if (buffer.length < 24) return null;

    // Check PNG signature
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== pngSignature[i]) return null;
    }

    // Read width and height from IHDR chunk (big-endian)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    if (width > 0 && height > 0) {
      return { width, height };
    }
  } catch (error) {
    console.error("Error extracting PNG dimensions:", error);
  }
  return null;
}

/**
 * Extract dimensions from JPEG image data
 * JPEG stores dimensions in SOF0/SOF2 markers (0xFFC0 or 0xFFC2)
 * @param buffer - Buffer containing JPEG image data
 * @returns Object with width and height, or null if cannot be determined
 */
function getJPEGDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    if (buffer.length < 2) return null;

    // Check JPEG signature (SOI marker)
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

    let offset = 2;
    while (offset < buffer.length - 1) {
      // Find marker
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        // Skip marker (2 bytes) + length (2 bytes) + precision (1 byte)
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);

        if (width > 0 && height > 0) {
          return { width, height };
        }
      }

      // Skip to next marker
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        // Standalone markers without length
        offset += 2;
      } else {
        // Read segment length and skip
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }
  } catch (error) {
    console.error("Error extracting JPEG dimensions:", error);
  }
  return null;
}

/**
 * Extract dimensions from GIF image data
 * GIF stores dimensions at bytes 6-9 (little-endian)
 */
function getGIFDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  try {
    if (buffer.length < 10) return null;

    // Check GIF signature
    const sig = buffer.slice(0, 6).toString("ascii");
    if (sig !== "GIF87a" && sig !== "GIF89a") return null;

    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);

    if (width > 0 && height > 0) {
      return { width, height };
    }
  } catch (error) {
    console.error("Error extracting GIF dimensions:", error);
  }
  return null;
}

/**
 * Extract dimensions from any supported image buffer
 */
function getImageDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  // Try PNG first
  const pngDims = getPNGDimensions(buffer);
  if (pngDims) return pngDims;

  // Try JPEG
  const jpegDims = getJPEGDimensions(buffer);
  if (jpegDims) return jpegDims;

  // Try GIF
  const gifDims = getGIFDimensions(buffer);
  if (gifDims) return gifDims;

  return null;
}

/**
 * Calculate image dimensions preserving aspect ratio
 * @param dataWidth - Optional width attribute
 * @param dataHeight - Optional height attribute
 * @param buffer - Optional image buffer for extracting real dimensions
 * @param maxWidth - Maximum width to constrain to (default 500 for better DOCX display)
 * @returns Object with calculated width and height
 */
function calculateImageDimensions(
  dataWidth: string | null,
  dataHeight: string | null,
  buffer?: Buffer,
  maxWidth: number = 500,
): { width: number; height: number } {
  let origWidth: number | undefined;
  let origHeight: number | undefined;

  // Try to get dimensions from image buffer first (most accurate)
  if (buffer) {
    const dims = getImageDimensions(buffer);
    if (dims) {
      origWidth = dims.width;
      origHeight = dims.height;
    }
  }

  // Fall back to data attributes if available
  if (!origWidth && dataWidth) {
    origWidth = parseInt(dataWidth);
  }
  if (!origHeight && dataHeight) {
    origHeight = parseInt(dataHeight);
  }

  // Calculate proportional dimensions preserving aspect ratio
  if (origWidth && origHeight && origWidth > 0 && origHeight > 0) {
    // If image is smaller than maxWidth, use original size
    if (origWidth <= maxWidth) {
      return { width: origWidth, height: origHeight };
    }
    // Scale down to maxWidth while preserving aspect ratio
    const aspectRatio = origWidth / origHeight;
    const scaledHeight = Math.round(maxWidth / aspectRatio);
    return { width: maxWidth, height: scaledHeight };
  }

  // Default fallback (4:3 aspect ratio)
  return { width: maxWidth, height: Math.round(maxWidth * 0.75) };
}

/** Decode common HTML entities in plain text extracted from HTML */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&copy;/g, "\u00a9")
    .replace(/&reg;/g, "\u00ae")
    .replace(/&trade;/g, "\u2122")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

/**
 * Build text/image runs from a single paragraph's inner HTML content (server-side).
 * Recursively handles inline formatting tags (<strong>, <em>, <mark>, <u>, <s>, <a>,
 * <sub>, <sup>) via regex, mirroring the client-side `extractTextRuns` behavior.
 */
function buildServerRunsFromContent(
  html: string,
  inherited: TextStyles = {},
): (TextRun | ImageRun | ExternalHyperlink)[] {
  const runs: (TextRun | ImageRun | ExternalHyperlink)[] = [];

  // Regex that matches: <br>, <img ...>, opening tags, closing tags, or text between tags
  const tokenRegex =
    /(<br\s*\/?>)|(<img\s[^>]*>)|(<(a|strong|b|em|i|u|s|del|mark|code|sub|sup)\b[^>]*>)|(<\/(a|strong|b|em|i|u|s|del|mark|code|sub|sup)>)/gi;

  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(html)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      const textBefore = decodeHtmlEntities(
        html.substring(lastIndex, match.index),
      );
      if (textBefore) {
        runs.push(
          new TextRun({
            text: textBefore,
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
    }

    if (match[1]) {
      // <br>
      runs.push(new TextRun({ text: "", break: 1 }));
      lastIndex = match.index + match[0].length;
    } else if (match[2]) {
      // <img ...>
      const tagAttrs = match[2];
      const srcMatch = /src\s*=\s*["']?(data:image[^"'\s>]+)["']?/i.exec(
        tagAttrs,
      );
      if (srcMatch) {
        const dataUrl = srcMatch[1];
        const dataWidth =
          /data-width\s*=\s*["']?(\d+)/i.exec(tagAttrs)?.[1] ?? null;
        const dataHeight =
          /data-height\s*=\s*["']?(\d+)/i.exec(tagAttrs)?.[1] ?? null;
        try {
          const buffer = base64ToBuffer(dataUrl);
          const dims = calculateImageDimensions(
            dataWidth,
            dataHeight,
            buffer,
            500,
          );
          const imageType = getImageType(dataUrl);
          runs.push(
            new ImageRun({
              data: buffer as unknown as Uint8Array,
              type: imageType,
              transformation: { width: dims.width, height: dims.height },
            }),
          );
        } catch (error) {
          console.error(
            "Server parser: Error processing data URL image:",
            error,
          );
          runs.push(
            new TextRun({
              text: "[Image]",
              color: "0563C1",
              underline: {},
              font: "Roboto",
            }),
          );
        }
      }
      lastIndex = match.index + match[0].length;
    } else if (match[3]) {
      // Opening inline tag — find matching close, recurse on inner content
      const tag = match[4].toLowerCase();
      const openTag = match[3];
      const closePattern = new RegExp(
        `</${tag}>`,
        "i",
      );

      // Find the matching closing tag (simple non-nested search; nesting of
      // the same tag is extremely rare in TipTap output)
      const afterOpen = match.index + openTag.length;
      const closeMatch = closePattern.exec(html.substring(afterOpen));

      if (closeMatch) {
        const innerHtml = html.substring(
          afterOpen,
          afterOpen + closeMatch.index,
        );

        // Build child styles
        const childStyles: TextStyles = { ...inherited };
        switch (tag) {
          case "strong":
          case "b":
            childStyles.bold = true;
            break;
          case "em":
          case "i":
            childStyles.italics = true;
            break;
          case "u":
            childStyles.underline = childStyles.underline ?? {};
            break;
          case "s":
          case "del":
            childStyles.strike = true;
            break;
          case "mark":
            childStyles.highlight = { type: "clear", fill: "FFFF00" };
            break;
          case "sub":
            childStyles.subScript = true;
            break;
          case "sup":
            childStyles.superScript = true;
            break;
        }

        if (tag === "a") {
          const href =
            /href\s*=\s*["']([^"']*)["']/i.exec(openTag)?.[1] ?? null;
          const linkStyles: TextStyles = {
            ...inherited,
            color: "0563C1",
            underline: inherited.underline ?? {},
          };
          const childRuns = buildServerRunsFromContent(innerHtml, linkStyles);
          if (href) {
            const textRuns = childRuns.filter(
              (r): r is TextRun => r instanceof TextRun,
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
        } else {
          runs.push(...buildServerRunsFromContent(innerHtml, childStyles));
        }

        // Advance past the closing tag
        const newIndex = afterOpen + closeMatch.index + closeMatch[0].length;
        tokenRegex.lastIndex = newIndex;
        lastIndex = newIndex;
      } else {
        // No matching close tag — treat opening tag as text and move on
        lastIndex = match.index + match[0].length;
      }
    } else if (match[5]) {
      // Stray closing tag (no matching open) — skip it
      lastIndex = match.index + match[0].length;
    }
  }

  // Trailing text after last match
  if (lastIndex < html.length) {
    const textAfter = decodeHtmlEntities(html.substring(lastIndex));
    if (textAfter) {
      runs.push(
        new TextRun({
          text: textAfter,
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
  }

  return runs;
}

/**
 * Server-side HTML parsing for images and basic tags
 * Uses regex since DOMParser is not available in Node.js
 *
 * @param html - HTML string to parse
 * @param baseStyles - Optional base styles to apply to all text runs
 * @returns Array of DOCX Paragraph objects
 */
function parseHtmlContentServer(
  html: string,
  baseStyles?: TextStyles,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // First, split by paragraph tags
  const paraRegex = /<p[^>]*>(.*?)<\/p>/gs;
  const matches = [...html.matchAll(paraRegex)];
  const paraMatches: (
    | RegExpMatchArray
    | { 0: string; 1: string; index: number; input: string; groups?: undefined }
  )[] = [];

  if (matches.length === 0) {
    // If no paragraphs found, treat entire content as one paragraph
    paraMatches.push({
      0: html,
      1: html,
      index: 0,
      input: html,
      groups: undefined,
    });
  } else {
    paraMatches.push(...matches);
  }

  for (const paraMatch of paraMatches) {
    const paraContent = paraMatch[1] || paraMatch[0];
    const paraRuns = buildServerRunsFromContent(paraContent, baseStyles);

    // Only add paragraph if it has content
    if (paraRuns.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: paraRuns,
          spacing: { after: 100 },
        }),
      );
    } else if (paraContent.trim() === "" || paraContent.match(/<br\s*\/?>/i)) {
      // Empty paragraph (for line breaks)
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 100 },
        }),
      );
    }
  }

  return paragraphs;
}

/**
 * Convert HTML content (from TipTap getHTML()) to docx Paragraph elements
 */
export function parseHtmlContent(
  html: string,
  baseStyles?: TextStyles,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!html || typeof html !== "string" || html.trim() === "") {
    return paragraphs;
  }

  // Use native DOMParser on client, regex parser on server
  if (typeof window !== "undefined") {
    return parseHtmlContentClient(html, baseStyles);
  } else {
    return parseHtmlContentServer(html, baseStyles);
  }
}

/**
 * Parse HTML and return the runs of the first paragraph plus any remaining paragraphs.
 * Use this when you need to prepend a custom run (e.g. "PU Note: ") to the first paragraph
 * without relying on internal docx object structure.
 */
export function parseHtmlFirstParagraphRuns(
  html: string,
  baseStyles?: TextStyles,
): { runs: any[]; remainingParagraphs: Paragraph[] } {
  if (!html || typeof html !== "string" || html.trim() === "") {
    return { runs: [], remainingParagraphs: [] };
  }

  if (typeof window !== "undefined") {
    // Client-side: use DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = Array.from(doc.body.children);
    if (elements.length === 0) return { runs: [], remainingParagraphs: [] };

    const runs = extractTextRuns(elements[0], baseStyles);
    const remainingParagraphs =
      elements.length > 1
        ? parseHtmlContentClient(
            elements
              .slice(1)
              .map((e) => e.outerHTML)
              .join(""),
            baseStyles,
          )
        : [];
    return { runs, remainingParagraphs };
  } else {
    // Server-side: use regex
    const paraRegex = /<p[^>]*>(.*?)<\/p>/gs;
    const matches = [...html.matchAll(paraRegex)];
    if (matches.length === 0) {
      // No paragraph tags — treat whole content as runs
      const runs = buildServerRunsFromContent(html, baseStyles);
      return { runs, remainingParagraphs: [] };
    }

    const runs = buildServerRunsFromContent(matches[0][1], baseStyles);
    const remainingHtml = matches
      .slice(1)
      .map((m) => m[0])
      .join("");
    const remainingParagraphs = remainingHtml
      ? parseHtmlContentServer(remainingHtml, baseStyles)
      : [];
    return { runs, remainingParagraphs };
  }
}

/**
 * Client-side HTML parsing using DOMParser
 */
function parseHtmlContentClient(
  html: string,
  baseStyles?: TextStyles,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Process each child element
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
        element.innerHTML.includes("<br>")
      ) {
        // Empty paragraph with br tag - preserve as line break
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
        const numberRun = new TextRun({ text: `${idx + 1}. `, font: "Roboto" });
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
      const lines = (
        (element as HTMLElement).innerText ??
        element.textContent ??
        ""
      ).split("\n");
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
            // Convert base64 image to buffer and embed
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
            // For any other URL type (external URLs should have been converted to data URLs by export)
            console.warn(
              "Client parser: Image src is not a data URL:",
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
          console.error("Client parser: Error processing image:", error);
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

function extractTextRuns(element: Element, inherited: TextStyles = {}): any[] {
  const runs: any[] = [];

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent;
      if (text) {
        const lines = text.split("\n");
        lines.forEach((line, index) => {
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
    } else if (node.nodeType === Node.ELEMENT_NODE) {
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
            (r): r is TextRun => r instanceof TextRun,
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
