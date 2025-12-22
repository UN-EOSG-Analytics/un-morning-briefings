import { Document, Paragraph, TextRun, ImageRun } from 'docx';

/**
 * Convert TipTap HTML content to docx Paragraph elements
 */
export function parseHtmlContent(html: string): Paragraph[] {
  if (!html || html.trim() === '') {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs: Paragraph[] = [];

  for (const elem of Array.from(doc.body.children)) {
    const tagName = elem.tagName.toLowerCase();

    if (tagName === 'img') {
      // Handle image elements
      const src = elem.getAttribute('src') || '';
      const alt = elem.getAttribute('alt') || 'Image';

      if (src.startsWith('data:image')) {
        // Base64 image
        try {
          const base64Data = src.split(',')[1];
          const mimeMatch = src.match(/data:([^;]+)/)?.[1] || 'image/png';
          // Map MIME types to docx format types
          let docxType: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg' = 'png';
          if (mimeMatch.includes('jpeg') || mimeMatch.includes('jpg')) {
            docxType = 'jpg';
          } else if (mimeMatch.includes('gif')) {
            docxType = 'gif';
          } else if (mimeMatch.includes('bmp')) {
            docxType = 'bmp';
          } else if (mimeMatch.includes('svg')) {
            docxType = 'svg';
          }

          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: base64Data,
                  type: docxType,
                  transformation: {
                    width: 400,
                    height: 300,
                  },
                  fallback: {
                    children: [
                      new TextRun({ text: alt || '[Image]', font: 'Roboto' }),
                    ],
                  },
                }),
              ],
              spacing: { after: 100, before: 100 },
            })
          );
        } catch (e) {
          // Fallback if image parsing fails
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `[Image: ${alt}]`, italics: true, font: 'Roboto' })],
              spacing: { after: 100 },
            })
          );
        }
      } else {
        // External image URL - show as link
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `[Image: ${src}]`, color: '0000FF', underline: {}, font: 'Roboto' })],
            spacing: { after: 100 },
          })
        );
      }
    } else if (tagName === 'p') {
      const runs = extractRuns(elem);
      paragraphs.push(
        new Paragraph({
          children:
            runs.length > 0
              ? runs.map(
                  (run) =>
                    new TextRun({
                      text: run.text,
                      bold: run.bold,
                      italics: run.italics,
                      strike: run.strike,
                      font: run.font || 'Roboto',
                    })
                )
              : [
                  new TextRun({
                    text: elem.textContent || '',
                    font: 'Roboto',
                  }),
                ],
          spacing: { after: 100 },
        })
      );
    } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      const runs = extractRuns(elem);
      paragraphs.push(
        new Paragraph({
          children:
            runs.length > 0
              ? runs.map(
                  (run) =>
                    new TextRun({
                      text: run.text,
                      bold: true,
                      font: run.font || 'Roboto',
                      size: tagName === 'h1' ? 28 : tagName === 'h2' ? 24 : 20,
                    })
                )
              : [
                  new TextRun({
                    text: elem.textContent || '',
                    bold: true,
                    font: 'Roboto',
                    size: 24,
                  }),
                ],
          spacing: { after: 150, before: 100 },
        })
      );
    } else if (tagName === 'ul') {
      const items = Array.from(elem.querySelectorAll(':scope > li'));
      items.forEach((item) => {
        const runs = extractRuns(item);
        paragraphs.push(
          new Paragraph({
            bullet: {
              level: 0,
            },
            children:
              runs.length > 0
                ? runs.map(
                    (run) =>
                      new TextRun({
                        text: run.text,
                        bold: run.bold,
                        italics: run.italics,
                        strike: run.strike,
                        font: run.font || 'Roboto',
                      })
                  )
                : [
                    new TextRun({
                      text: item.textContent || '',
                      font: 'Roboto',
                    }),
                  ],
          })
        );
      });
    } else if (tagName === 'ol') {
      const items = Array.from(elem.querySelectorAll(':scope > li'));
      items.forEach((item) => {
        const runs = extractRuns(item);
        paragraphs.push(
          new Paragraph({
            numbering: {
              reference: 'numbering',
              level: 0,
            },
            children:
              runs.length > 0
                ? runs.map(
                    (run) =>
                      new TextRun({
                        text: run.text,
                        bold: run.bold,
                        italics: run.italics,
                        strike: run.strike,
                        font: run.font || 'Roboto',
                      })
                  )
                : [
                    new TextRun({
                      text: item.textContent || '',
                      font: 'Roboto',
                    }),
                  ],
          })
        );
      });
    } else if (tagName === 'blockquote') {
      const runs = extractRuns(elem);
      paragraphs.push(
        new Paragraph({
          children:
            runs.length > 0
              ? runs.map(
                  (run) =>
                    new TextRun({
                      text: run.text,
                      italics: true,
                      font: run.font || 'Roboto',
                      color: '495057',
                    })
                )
              : [
                  new TextRun({
                    text: elem.textContent || '',
                    italics: true,
                    font: 'Roboto',
                    color: '495057',
                  }),
                ],
          border: {
            left: {
              color: '009edb',
              space: 100,
              style: 'single',
              size: 12,
            },
          },
          spacing: { after: 100, before: 100 },
        })
      );
    } else if (tagName === 'pre') {
      const codeContent = elem.textContent || '';
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeContent,
              font: 'Courier New',
              size: 18,
              color: 'd4d4d4',
            }),
          ],
          shading: {
            type: 'clear',
            color: '1e1e1e',
          },
          spacing: { after: 100, before: 100 },
        })
      );
    } else if (tagName === 'hr') {
      paragraphs.push(
        new Paragraph({
          text: '─'.repeat(60),
          spacing: { after: 100, before: 100 },
        })
      );
    } else if (tagName === 'a') {
      const href = elem.getAttribute('href') || '';
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: elem.textContent || href,
              color: '0000FF',
              underline: {},
              font: 'Roboto',
            }),
          ],
        })
      );
    } else {
      // Recursively process other elements
      const nestedParagraphs = parseHtmlContent(elem.innerHTML);
      paragraphs.push(...nestedParagraphs);
    }
  }

  return paragraphs;
}

/**
 * Extract formatted text runs from an element
 */
function extractRuns(
  elem: Element
): Array<{ text: string; bold?: boolean; italics?: boolean; strike?: boolean; font?: string }> {
  const runs: Array<{
    text: string;
    bold?: boolean;
    italics?: boolean;
    strike?: boolean;
    font?: string;
  }> = [];
  const children = Array.from(elem.childNodes);

  if (children.length === 0) {
    const text = elem.textContent?.trim();
    if (text) {
      runs.push({ text, font: 'Roboto' });
    }
    return runs;
  }

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child as Text).textContent?.trim();
      if (text) {
        runs.push({ text, font: 'Roboto' });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElem = child as Element;
      const tagName = childElem.tagName.toLowerCase();

      // Skip img elements - they're handled at the paragraph level
      if (tagName === 'img') {
        continue;
      }

      switch (tagName) {
        case 'strong':
        case 'b':
          runs.push({
            text: childElem.textContent || '',
            bold: true,
            font: 'Roboto',
          });
          break;
        case 'em':
        case 'i':
          runs.push({
            text: childElem.textContent || '',
            italics: true,
            font: 'Roboto',
          });
          break;
        case 'code':
          runs.push({
            text: childElem.textContent || '',
            font: 'Courier New',
          });
          break;
        case 's':
        case 'del':
          runs.push({
            text: childElem.textContent || '',
            strike: true,
            font: 'Roboto',
          });
          break;
        case 'a':
          runs.push({
            text: childElem.textContent || '',
            font: 'Roboto',
          });
          break;
        default:
          const nestedRuns = extractRuns(childElem);
          runs.push(...nestedRuns);
      }
    }
  }

  return runs;
}
