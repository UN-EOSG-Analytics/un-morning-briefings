/* eslint-disable @typescript-eslint/no-explicit-any */
import { Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';

/**
 * Convert TipTap JSON to docx Paragraph elements
 * This preserves all formatting from the rich text editor
 */
export function tiptapJsonToDocx(json: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!json || !json.content) {
    return paragraphs;
  }

  for (const node of json.content) {
    const converted = convertNode(node);
    paragraphs.push(...converted);
  }

  return paragraphs;
}

function convertNode(node: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  switch (node.type) {
    case 'paragraph':
      paragraphs.push(convertParagraph(node));
      break;
    case 'heading':
      paragraphs.push(convertHeading(node));
      break;
    case 'bulletList':
      paragraphs.push(...convertBulletList(node));
      break;
    case 'orderedList':
      paragraphs.push(...convertOrderedList(node));
      break;
    case 'blockquote':
      paragraphs.push(convertBlockquote(node));
      break;
    case 'codeBlock':
      paragraphs.push(convertCodeBlock(node));
      break;
    case 'horizontalRule':
      paragraphs.push(
        new Paragraph({
          text: '─'.repeat(60),
          spacing: { after: 100, before: 100 },
        })
      );
      break;
    case 'image':
      paragraphs.push(convertImage(node));
      break;
    default:
      // For unknown nodes, try to extract text content
      if (node.content) {
        for (const child of node.content) {
          paragraphs.push(...convertNode(child));
        }
      }
  }

  return paragraphs;
}

function convertParagraph(node: any): Paragraph {
  const runs = extractTextRuns(node.content || []);
  const alignment = getAlignment(node.attrs?.textAlign);

  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun({ text: '', font: 'Roboto' })],
    alignment,
    spacing: { after: 100 },
  });
}

function convertHeading(node: any): Paragraph {
  const level = node.attrs?.level || 1;
  const runs = extractTextRuns(node.content || []);
  const alignment = getAlignment(node.attrs?.textAlign);

  let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel];
  let fontSize: number;

  switch (level) {
    case 1:
      headingLevel = HeadingLevel.HEADING_1;
      fontSize = 28;
      break;
    case 2:
      headingLevel = HeadingLevel.HEADING_2;
      fontSize = 24;
      break;
    case 3:
      headingLevel = HeadingLevel.HEADING_3;
      fontSize = 20;
      break;
    default:
      headingLevel = HeadingLevel.HEADING_1;
      fontSize = 24;
  }

  return new Paragraph({
    children:
      runs.length > 0
        ? runs.map((run) => new TextRun({ ...run, bold: true, size: fontSize, font: 'Roboto' }))
        : [new TextRun({ text: '', bold: true, size: fontSize, font: 'Roboto' })],
    heading: headingLevel,
    alignment,
    spacing: { after: 150, before: 100 },
  });
}

function convertBulletList(node: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (node.content) {
    for (const item of node.content) {
      if (item.type === 'listItem') {
        const runs = extractTextRuns(item.content?.[0]?.content || []);
        paragraphs.push(
          new Paragraph({
            children:
              runs.length > 0 ? runs : [new TextRun({ text: '', font: 'Roboto' })],
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      }
    }
  }

  return paragraphs;
}

function convertOrderedList(node: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (node.content) {
    for (const item of node.content) {
      if (item.type === 'listItem') {
        const runs = extractTextRuns(item.content?.[0]?.content || []);
        paragraphs.push(
          new Paragraph({
            children:
              runs.length > 0 ? runs : [new TextRun({ text: '', font: 'Roboto' })],
            numbering: { reference: 'numbering', level: 0 },
            spacing: { after: 50 },
          })
        );
      }
    }
  }

  return paragraphs;
}

function convertBlockquote(node: any): Paragraph {
  const runs = extractTextRuns(node.content?.[0]?.content || []);

  return new Paragraph({
    children:
      runs.length > 0
        ? runs.map((run) => new TextRun({ ...run, italics: true, color: '495057', font: 'Roboto' }))
        : [new TextRun({ text: '', italics: true, color: '495057', font: 'Roboto' })],
    border: {
      left: {
        color: '009edb',
        space: 100,
        style: 'single',
        size: 12,
      },
    },
    spacing: { after: 100, before: 100 },
  });
}

function convertCodeBlock(node: any): Paragraph {
  const text = extractTextContent(node);

  return new Paragraph({
    children: [
      new TextRun({
        text,
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
  });
}

function convertImage(node: any): Paragraph {
  // Images are stored as data in TipTap
  const alt = node.attrs?.alt || 'Image';
  
  return new Paragraph({
    children: [new TextRun({ text: `[Image: ${alt}]`, color: '0000FF', underline: { type: UnderlineType.SINGLE }, font: 'Roboto' })],
    spacing: { after: 100, before: 100 },
  });
}

function extractTextRuns(content: any[]): any[] {
  const runs: any[] = [];

  for (const node of content) {
    if (node.type === 'text') {
      const marks = node.marks || [];
      const run: any = {
        text: node.text || '',
        font: 'Roboto',
      };

      for (const mark of marks) {
        switch (mark.type) {
          case 'bold':
            run.bold = true;
            break;
          case 'italic':
            run.italics = true;
            break;
          case 'strike':
            run.strike = true;
            break;
          case 'code':
            run.font = 'Courier New';
            break;
          case 'link':
            run.color = '0000FF';
            run.underline = { type: UnderlineType.SINGLE };
            break;
          case 'underline':
            run.underline = { type: UnderlineType.SINGLE };
            break;
        }
      }

      runs.push(new TextRun(run));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '\n', font: 'Roboto' }));
    } else {
      // Handle nested content
      if (node.content) {
        runs.push(...extractTextRuns(node.content));
      }
    }
  }

  return runs;
}

function extractTextContent(node: any): string {
  if (node.type === 'text') {
    return node.text || '';
  }

  if (node.content) {
    return node.content.map(extractTextContent).join('');
  }

  return '';
}

function getAlignment(align?: string): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}
