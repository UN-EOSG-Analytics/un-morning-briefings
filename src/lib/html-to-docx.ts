
// Convert HTML content from TipTap editor to DOCX Paragraph elements
import { Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';

/**
 * Convert base64 data URL to Buffer for image embedding
 * @param dataUrl - Data URL starting with data:image/...;base64,
 * @returns Buffer containing the image data
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const base64String = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
  return Buffer.from(base64String, 'base64');
}

/**
 * Extract dimensions from PNG image data
 * PNG header format: bytes 16-20 contain width (big-endian), bytes 20-24 contain height (big-endian)
 * @param buffer - Buffer containing PNG image data
 * @returns Object with width and height, or null if cannot be determined
 */
function getPNGDimensions(buffer: Buffer): { width: number; height: number } | null {
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
    console.error('Error extracting PNG dimensions:', error);
  }
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
  maxWidth: number = 500
): { width: number; height: number } {
  let width = maxWidth;
  let height = 375; // Default aspect ratio fallback
  
  // Try to get dimensions from PNG header first
  let origWidth: number | undefined;
  let origHeight: number | undefined;
  
  if (buffer) {
    const pngDims = getPNGDimensions(buffer);
    if (pngDims) {
      origWidth = pngDims.width;
      origHeight = pngDims.height;
    }
  }
  
  // Fall back to data attributes if available
  if (!origWidth && dataWidth) {
    origWidth = parseInt(dataWidth);
  }
  if (!origHeight && dataHeight) {
    origHeight = parseInt(dataHeight);
  }
  
  // Calculate proportional dimensions
  if (origWidth && origHeight && origWidth > 0 && origHeight > 0) {
    const aspectRatio = origWidth / origHeight;
    height = Math.round(width / aspectRatio);
  }
  
  return { width, height };
}

/**
 * Server-side HTML parsing for images and basic tags
 * Uses regex since DOMParser is not available in Node.js
 * 
 * @param html - HTML string to parse
 * @returns Array of DOCX Paragraph objects
 */
function parseHtmlContentServer(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // First, split by paragraph tags
  const paraRegex = /<p[^>]*>(.*?)<\/p>/gs;
  const matches = [...html.matchAll(paraRegex)];
  const paraMatches: (RegExpMatchArray | { 0: string; 1: string; index: number; input: string; groups?: undefined })[] = [];
  
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
  
  console.log('Server parser: Found', paraMatches.length, 'paragraphs');
  
  for (const paraMatch of paraMatches) {
    let paraContent = paraMatch[1] || paraMatch[0];
    const paraRuns: (TextRun | ImageRun)[] = [];
    
    // Split content by <br> tags first
    const parts = paraContent.split(/<br\s*\/?>/i);
    
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      
      // Process images within this part
      const imgRegex = /<img\s+[^>]*?src\s*=\s*["']?(data:image[^"'\s>]+)["']?[^>]*?(?:data-width\s*=\s*["']?(\d+)["'])?[^>]*?(?:data-height\s*=\s*["']?(\d+)["'])?[^>]*?>/gi;
      let lastIndex = 0;
      let imgMatch;
      
      while ((imgMatch = imgRegex.exec(part)) !== null) {
        // Add text before the image
        const textBefore = part.substring(lastIndex, imgMatch.index);
        const cleanedText = textBefore.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (cleanedText) {
          paraRuns.push(new TextRun({ text: cleanedText, font: 'Roboto' }));
        }
        
        // Add the image
        const dataUrl = imgMatch[1];
        const dataWidth = imgMatch[2];
        const dataHeight = imgMatch[3];
        console.log('Server parser: Found data URL image with dimensions:', { width: dataWidth, height: dataHeight });
        
        try {
          const buffer = base64ToBuffer(dataUrl);
          const dims = calculateImageDimensions(dataWidth, dataHeight, buffer, 500);
          
          paraRuns.push(
            new ImageRun({
              data: buffer as unknown as Uint8Array,
              type: 'png',
              transformation: { width: dims.width, height: dims.height },
            })
          );
          console.log('Server parser: Successfully embedded data URL image');
        } catch (error) {
          console.error('Server parser: Error processing data URL image:', error);
          paraRuns.push(new TextRun({ text: '[Image]', color: '0563C1', underline: {}, font: 'Roboto' }));
        }
        
        lastIndex = imgMatch.index + imgMatch[0].length;
      }
      
      // Add remaining text after the last image
      const textAfter = part.substring(lastIndex);
      const cleanedTextAfter = textAfter.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (cleanedTextAfter) {
        paraRuns.push(new TextRun({ text: cleanedTextAfter, font: 'Roboto' }));
      }
      
      // Add line break between parts (except after the last part)
      if (partIndex < parts.length - 1) {
        paraRuns.push(new TextRun({ text: '', break: 1 }));
      }
    }
    
    // Only add paragraph if it has content
    if (paraRuns.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: paraRuns,
          spacing: { after: 100 },
        })
      );
    } else if (paraContent.trim() === '' || paraContent.match(/<br\s*\/?>/i)) {
      // Empty paragraph (for line breaks)
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 100 },
        })
      );
    }
  }
  
  console.log('Server parser: Finished, returned', paragraphs.length, 'paragraphs');
  return paragraphs;
}

/**
 * Convert HTML content (from TipTap getHTML()) to docx Paragraph elements
 */
export function parseHtmlContent(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!html || typeof html !== 'string' || html.trim() === '') {
    return paragraphs;
  }

  // Use native DOMParser on client, regex parser on server
  if (typeof window !== 'undefined') {
    return parseHtmlContentClient(html);
  } else {
    return parseHtmlContentServer(html);
  }
}

/**
 * Client-side HTML parsing using DOMParser
 */
function parseHtmlContentClient(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Process each child element
  for (const element of Array.from(doc.body.children)) {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'p') {
      const children = extractTextRuns(element);
      if (children.length > 0) {
        paragraphs.push(
          new Paragraph({
            children,
            spacing: { after: 100 },
          })
        );
      } else if (!element.textContent?.trim() && element.innerHTML.includes('<br>')) {
        // Empty paragraph with br tag - preserve as line break
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { after: 100 },
          })
        );
      } else if (element.textContent?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: element.textContent, font: 'Roboto' })],
            spacing: { after: 100 },
          })
        );
      }
    } else if (['h1', 'h2', 'h3'].includes(tagName)) {
      const level = parseInt(tagName.slice(1));
      const children = extractTextRuns(element);
      const sizes: Record<number, number> = { 1: 28, 2: 24, 3: 20 };

      paragraphs.push(
        new Paragraph({
          children: children.length > 0 ? children : [new TextRun({ text: element.textContent || '', bold: true, font: 'Roboto' })],
          spacing: { before: 100, after: 150 },
        })
      );
    } else if (tagName === 'ul') {
      const items = Array.from(element.querySelectorAll(':scope > li'));
      items.forEach((item) => {
        const children = extractTextRuns(item);
        paragraphs.push(
          new Paragraph({
            children: children.length > 0 ? children : [new TextRun({ text: item.textContent || '', font: 'Roboto' })],
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      });
    } else if (tagName === 'ol') {
      const items = Array.from(element.querySelectorAll(':scope > li'));
      items.forEach((item, index) => {
        const children = extractTextRuns(item);
        paragraphs.push(
          new Paragraph({
            children: children.length > 0 ? children : [new TextRun({ text: item.textContent || '', font: 'Roboto' })],
            numbering: { reference: 'numbering', level: 0 },
            spacing: { after: 50 },
          })
        );
      });
    } else if (tagName === 'blockquote') {
      const children = extractTextRuns(element);
      paragraphs.push(
        new Paragraph({
          children: children.length > 0 ? children : [new TextRun({ text: element.textContent || '', italics: true, font: 'Roboto' })],
          border: {
            left: {
              color: '009edb',
              space: 100,
              style: 'single',
              size: 12,
            },
          },
          spacing: { after: 100 },
        })
      );
    } else if (tagName === 'pre') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: element.textContent || '', font: 'Courier New', size: 18 })],
          shading: { fill: 'E7E6E6' },
          spacing: { after: 100 },
        })
      );
    } else if (tagName === 'hr') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '─'.repeat(60), color: 'CCCCCC' })],
          spacing: { after: 100 },
        })
      );
    } else if (tagName === 'img') {
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt') || 'Image';
      const dataWidth = element.getAttribute('data-width');
      const dataHeight = element.getAttribute('data-height');
      let width = 500;
      let height = 375;
      
      // Use stored dimensions if available and preserve aspect ratio
      if (dataWidth && dataHeight) {
        const origWidth = parseInt(dataWidth);
        const origHeight = parseInt(dataHeight);
        if (origWidth && origHeight) {
          const aspectRatio = origWidth / origHeight;
          height = Math.round(width / aspectRatio);
        }
      }

      console.log('Client parser: Processing img tag:', { src: src?.substring(0, 50), alt, width, height });

      if (src) {
        try {
          if (src.startsWith('data:image')) {
            // Convert base64 image to buffer and embed
            const buffer = base64ToBuffer(src);
            console.log('Client parser: Embedding data URL image, buffer size:', buffer.length);
            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: buffer as unknown as Uint8Array,
                    type: 'png',
                    transformation: {
                      width,
                      height,
                    },
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          } else {
            // For any other URL type (external URLs should have been converted to data URLs by export)
            console.warn('Client parser: Image src is not a data URL:', src.substring(0, 50));
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: `[Image: ${alt}]`, color: '0563C1', underline: {}, font: 'Roboto' })],
                spacing: { after: 100 },
              })
            );
          }
        } catch (error) {
          console.error('Client parser: Error processing image:', error);
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `[Image: ${alt}]`, color: '0563C1', underline: {}, font: 'Roboto' })],
              spacing: { after: 100 },
            })
          );
        }
      }
    }
  }

  return paragraphs;
}

function extractTextRuns(element: Element): any[] {
  const runs: any[] = [];

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent;
      if (text) {
        // Split by line breaks if any
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          if (line) {
            runs.push(new TextRun({ text: line, font: 'Roboto' }));
          }
          if (index < lines.length - 1) {
            runs.push(new TextRun({ text: '', break: 1 }));
          }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      switch (tag) {
        case 'br':
          runs.push(new TextRun({ text: '', break: 1 }));
          break;
        case 'strong':
        case 'b':
          runs.push(new TextRun({ text: el.textContent || '', bold: true, font: 'Roboto' }));
          break;
        case 'em':
        case 'i':
          runs.push(new TextRun({ text: el.textContent || '', italics: true, font: 'Roboto' }));
          break;
        case 'u':
          runs.push(new TextRun({ text: el.textContent || '', underline: {}, font: 'Roboto' }));
          break;
        case 's':
        case 'del':
          runs.push(new TextRun({ text: el.textContent || '', strike: true, font: 'Roboto' }));
          break;
        case 'code':
          runs.push(new TextRun({ text: el.textContent || '', font: 'Courier New' }));
          break;
        case 'a':
          runs.push(new TextRun({ text: el.textContent || '', color: '0563C1', underline: {}, font: 'Roboto' }));
          break;
        case 'img': {
          const src = el.getAttribute('src');
          if (src && src.startsWith('data:image')) {
            try {
              const buffer = base64ToBuffer(src);
              const dataWidth = el.getAttribute('data-width');
              const dataHeight = el.getAttribute('data-height');
              
              const dims = calculateImageDimensions(dataWidth, dataHeight, buffer, 300);
              
              console.log('Embedding inline image, buffer size:', buffer.length, 'dimensions:', dims);
              runs.push(
                new ImageRun({
                  data: buffer as unknown as Uint8Array,
                  type: 'png',
                  transformation: { width: dims.width, height: dims.height },
                })
              );
            } catch (error) {
              console.error('Error processing inline image:', error);
            }
          }
          break;
        }
        default:
          const nestedRuns = extractTextRuns(el);
          runs.push(...nestedRuns);
      }
    }
  }

  return runs;
}
