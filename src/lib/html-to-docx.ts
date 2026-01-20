/* eslint-disable @typescript-eslint/no-explicit-any */

// Convert HTML content from TipTap editor to DOCX Paragraph elements
import { Paragraph, TextRun, ImageRun } from 'docx';

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
 * Detect image type from data URL or buffer
 */
function getImageType(dataUrl: string): 'png' | 'gif' | 'jpg' | 'bmp' {
  if (dataUrl.includes('image/png')) return 'png';
  if (dataUrl.includes('image/gif')) return 'gif';
  if (dataUrl.includes('image/bmp')) return 'bmp';
  // Default to jpg for jpeg, jpg, or unknown
  return 'jpg';
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
 * Extract dimensions from JPEG image data
 * JPEG stores dimensions in SOF0/SOF2 markers (0xFFC0 or 0xFFC2)
 * @param buffer - Buffer containing JPEG image data
 * @returns Object with width and height, or null if cannot be determined
 */
function getJPEGDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (buffer.length < 2) return null;
    
    // Check JPEG signature (SOI marker)
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
    
    let offset = 2;
    while (offset < buffer.length - 1) {
      // Find marker
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      
      const marker = buffer[offset + 1];
      
      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        // Skip marker (2 bytes) + length (2 bytes) + precision (1 byte)
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
      
      // Skip to next marker
      if (marker === 0xD8 || marker === 0xD9 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
        // Standalone markers without length
        offset += 2;
      } else {
        // Read segment length and skip
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }
  } catch (error) {
    console.error('Error extracting JPEG dimensions:', error);
  }
  return null;
}

/**
 * Extract dimensions from GIF image data
 * GIF stores dimensions at bytes 6-9 (little-endian)
 */
function getGIFDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (buffer.length < 10) return null;
    
    // Check GIF signature
    const sig = buffer.slice(0, 6).toString('ascii');
    if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
    
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    
    if (width > 0 && height > 0) {
      return { width, height };
    }
  } catch (error) {
    console.error('Error extracting GIF dimensions:', error);
  }
  return null;
}

/**
 * Extract dimensions from any supported image buffer
 */
function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
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
  maxWidth: number = 500
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
    const paraContent = paraMatch[1] || paraMatch[0];
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
          const imageType = getImageType(dataUrl);
          
          paraRuns.push(
            new ImageRun({
              data: buffer as unknown as Uint8Array,
              type: imageType,
              transformation: { width: dims.width, height: dims.height },
            })
          );
          console.log('Server parser: Successfully embedded data URL image, type:', imageType, 'dims:', dims);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const level = parseInt(tagName.slice(1));
      const children = extractTextRuns(element);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      items.forEach((item) => {
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

      console.log('Client parser: Processing img tag:', { src: src?.substring(0, 50), alt });

      if (src) {
        try {
          if (src.startsWith('data:image')) {
            // Convert base64 image to buffer and embed
            const buffer = base64ToBuffer(src);
            const dims = calculateImageDimensions(dataWidth, dataHeight, buffer, 500);
            const imageType = getImageType(src);
            
            console.log('Client parser: Embedding data URL image, type:', imageType, 'dims:', dims);
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
        case 'mark':
          runs.push(new TextRun({ text: el.textContent || '', shading: { type: 'clear', fill: 'FFFF00' }, font: 'Roboto' }));
          break;
        case 'img': {
          const src = el.getAttribute('src');
          if (src && src.startsWith('data:image')) {
            try {
              const buffer = base64ToBuffer(src);
              const dataWidth = el.getAttribute('data-width');
              const dataHeight = el.getAttribute('data-height');
              
              const dims = calculateImageDimensions(dataWidth, dataHeight, buffer, 300);
              const imageType = getImageType(src);
              
              console.log('Embedding inline image, type:', imageType, 'dimensions:', dims);
              runs.push(
                new ImageRun({
                  data: buffer as unknown as Uint8Array,
                  type: imageType,
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
