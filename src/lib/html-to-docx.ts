
// Convert HTML content from TipTap editor to DOCX Paragraph elements
import { Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';

/**
 * Convert base64 data URL to Buffer
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const base64String = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64String, 'base64');
}

/**
 * Convert HTML content (from TipTap getHTML()) to docx Paragraph elements
 */
export function parseHtmlContent(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!html || typeof html !== 'string' || html.trim() === '') {
    return paragraphs;
  }

  // Parse HTML string
  if (typeof window === 'undefined') {
    // Server-side fallback
    return [
      new Paragraph({
        children: [new TextRun({ text: html, font: 'Roboto' })],
      }),
    ];
  }

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
      const width = parseInt(element.getAttribute('data-width') || '400');
      const height = parseInt(element.getAttribute('data-height') || '300');

      if (src) {
        try {
          if (src.startsWith('data:')) {
            // Convert base64 image to buffer and embed
            const buffer = base64ToBuffer(src);
            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: buffer,
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
            // For external URLs, show as link text
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: `[Image: ${alt}]`, color: '0563C1', underline: {}, font: 'Roboto' })],
                spacing: { after: 100 },
              })
            );
          }
        } catch (error) {
          console.error('Error processing image:', error);
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
      const text = (node as Text).textContent?.trim();
      if (text) {
        runs.push(new TextRun({ text, font: 'Roboto' }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      switch (tag) {
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
          if (src && src.startsWith('data:')) {
            try {
              const buffer = base64ToBuffer(src);
              const width = parseInt(el.getAttribute('data-width') || '200');
              const height = parseInt(el.getAttribute('data-height') || '150');
              runs.push(
                new ImageRun({
                  data: buffer,
                  transformation: { width, height },
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
