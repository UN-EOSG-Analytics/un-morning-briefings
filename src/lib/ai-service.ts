import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CATEGORIES, PRIORITIES, REGIONS, COUNTRIES_BY_REGION } from '@/types/morning-meeting';

interface AutoFillResult {
  category: string;
  priority: 'sg-attention' | 'situational-awareness';
  region: string;
  country: string;
  headline: string;
  date?: string;
  entry: string;
  sourceDate?: string;
}

// Initialize Azure OpenAI client
const azure = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  resourceName: process.env.AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com/', ''),
});

export async function autoFillFromContent(content: string): Promise<AutoFillResult> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file');
    throw new Error('AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }

  // Build lists for the prompt
  const categoryList = CATEGORIES.join(', ');
  const priorityList = PRIORITIES.map(p => p.value).join(', ');
  const regionList = REGIONS.join(', ');
  
  const prompt = `Analyze this news/briefing content and extract structured information. Return ONLY valid JSON with no markdown formatting.

Categories: ${categoryList}
Priorities: ${priorityList}
Regions: ${regionList}

Content:
${content}

FORMATTING INSTRUCTIONS FOR "entry" FIELD:
- Use clear paragraph breaks to separate distinct ideas
- Use **bold text** to emphasize important terms, figures, or key concepts (e.g., **5,000 people affected**)
- Use bullet points (each on a new line starting with "- ") for lists of items, impacts, or key points
- Use numbered lists (each on a new line starting with "1. ", "2. ", etc.) for sequential steps or recommendations
- Use quotation blocks (lines starting with "> ") to highlight direct quotes or critical statements
- Lead with a strong opening sentence summarizing the main issue
- Separate major sections with blank lines
- Keep paragraphs focused and concise (2-4 sentences max)
- Use natural formatting that makes the content easily scannable and well-organized

Return JSON:
{
  "category": "best matching category from list",
  "priority": "sg-attention or situational-awareness",
  "region": "best matching region from list",
  "country": "specific country name",
  "headline": "concise headline (max 120 chars)",
  "sourceDate": "YYYY-MM-DD date when this news/briefing was published or dated, if available, otherwise null",
  "entry": "well-formatted content with paragraph breaks, bold text (**text**), bullet points, quotations (> text), and logical structure"
}`;

  try {
    const { text } = await generateText({
      model: azure('gpt-4o'),
      prompt,
    });
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);
    
    // Convert extracted entry to TipTap HTML format
    const entryHtml = plainTextToTipTapHtml(parsed.entry || content);
    
    return {
      category: parsed.category || '',
      priority: parsed.priority || 'situational-awareness',
      region: parsed.region || '',
      country: parsed.country || '',
      headline: parsed.headline || '',
      date: parsed.date,
      entry: entryHtml,
      sourceDate: parsed.sourceDate || '',
    };
  } catch (error) {
    console.error('[AI SERVICE] Error details:', error);
    if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error('Failed to process content with AI');
  }
}

/**
 * Convert plain text to TipTap HTML format
 * Handles paragraph breaks, bullet points, numbered lists, bold text, and quotations
 */
function plainTextToTipTapHtml(text: string): string {
  if (!text) return '<p></p>';
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let html = '';
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for quotation block
    if (line.match(/^>\s+/)) {
      const quoteLines = [];
      while (i < lines.length && lines[i].match(/^>\s+/)) {
        const content = lines[i].replace(/^>\s+/, '');
        quoteLines.push(formatLineWithBold(content));
        i++;
      }
      html += '<blockquote>' + quoteLines.map(item => `<p>${item}</p>`).join('') + '</blockquote>';
      continue;
    }
    
    // Check for bullet point list
    if (line.match(/^[-•*]\s+/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^[-•*]\s+/)) {
        const content = lines[i].replace(/^[-•*]\s+/, '');
        listItems.push(formatLineWithBold(content));
        i++;
      }
      html += '<ul>' + listItems.map(item => `<li><p>${item}</p></li>`).join('') + '</ul>';
      continue;
    }
    
    // Check for numbered list
    if (line.match(/^\d+\.\s+/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        const content = lines[i].replace(/^\d+\.\s+/, '');
        listItems.push(formatLineWithBold(content));
        i++;
      }
      html += '<ol>' + listItems.map(item => `<li><p>${item}</p></li>`).join('') + '</ol>';
      continue;
    }
    
    // Regular paragraph
    const formatted = formatLineWithBold(line);
    html += `<p>${formatted}</p>`;
    i++;
  }
  
  return html || '<p></p>';
}

/**
 * Format line with bold text support
 * Converts **text** to <strong>text</strong>
 */
function formatLineWithBold(text: string): string {
  const escaped = escapeHtml(text);
  // Replace **text** with <strong>text</strong>
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a concise bullet-point summary of the briefing content
 */
export async function generateSummary(content: string): Promise<string[]> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file');
    throw new Error('AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }

  // Extract plain text from HTML
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

  if (!plainText) {
    throw new Error('Content is empty');
  }

  const prompt = `Create a concise executive summary of this briefing in 3-5 key bullet points.
Each bullet should be:
- One clear, complete sentence
- Focused on the most critical information
- Professional and suitable for UN leadership
- Maximum 20 words each

Return ONLY the bullet points, one per line, without bullet symbols or numbering.

Content:
${plainText}`;

  try {
    const { text } = await generateText({
      model: azure('gpt-4o'),
      prompt,
    });
    
    // Split into lines and clean up
    const bullets = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return bullets;
  } catch (error) {
    console.error('[AI SERVICE] Summary generation error:', error);
    if (error instanceof Error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
    throw new Error('Failed to generate summary');
  }
}

/**
 * Reformulate a selected portion of text while keeping it coherent with the full sentence
 * Takes the full sentence for context and returns only the reformulated selection
 */
export async function reformulateSelection(
  fullSentence: string,
  selectionStart: number,
  selectionEnd: number
): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file');
    throw new Error('AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }

  // Extract the parts
  const beforeText = fullSentence.substring(0, selectionStart);
  const selectedText = fullSentence.substring(selectionStart, selectionEnd);
  const afterText = fullSentence.substring(selectionEnd);

  const prompt = `Reformulate the selected portion of this UN briefing text to be more concise and professional.

Full sentence(s):
"${beforeText}<<<START SELECTION>>>${selectedText}<<<END SELECTION>>>${afterText}"

Task: Rewrite ONLY the text between <<<START SELECTION>>> and <<<END SELECTION>>>.
Make it concise and professional while ensuring it flows naturally with the surrounding text.

CRITICAL: Output ONLY your rewritten version of the selected text. Do not include:
- The surrounding context
- Quotes around your answer
- Explanations or comments
- The selection markers

Your reformulated text:`;

  try {
    const { text: reformulatedText } = await generateText({
      model: azure('gpt-4o'),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 400,
    });
    
    // Clean up response
    const cleanedText = reformulatedText.trim()
      .replace(/^["'`]+|["'`]+$/g, '') // Remove surrounding quotes
      .replace(/^(Here is|Here's|The rewritten|Rewritten)[:\s]*/i, '') // Remove meta prefixes
      .trim();
    
    // Validate response isn't meta-commentary
    const metaPatterns = [
      /^(Wait|Note|Context|Explanation|I would|I will|Let me|The text|This)/i,
      /<<<START SELECTION>>>/,
      /<<<END SELECTION>>>/
    ];
    
    for (const pattern of metaPatterns) {
      if (pattern.test(cleanedText)) {
        console.warn('[AI SERVICE] AI returned invalid response format');
        return selectedText;
      }
    }
    
    // If empty or suspiciously long, return original
    if (!cleanedText || cleanedText.length > selectedText.length * 3) {
      console.warn('[AI SERVICE] AI response invalid, using original text');
      return selectedText;
    }
    
    return cleanedText;
  } catch (error) {
    console.error('[AI SERVICE] Selection reformulation error:', error);
    if (error instanceof Error) {
      throw new Error(`Reformulation failed: ${error.message}`);
    }
    throw new Error('Failed to reformulate selected text');
  }
}

/**
 * Reformulate text to be concise, professional, and appropriate for a UN briefing
 * Preserves images at their original positions in the content
 */
export async function reformulateBriefing(content: string): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file');
    throw new Error('AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }

  // Extract and preserve all images with their positions
  const imageRegex = /<img[^>]*>/g;
  const images: string[] = [];
  let contentWithPlaceholders = content;
  
  // Replace each image with a placeholder and store the original
  contentWithPlaceholders = content.replace(imageRegex, (match) => {
    const index = images.length;
    images.push(match);
    return `[IMAGE_PLACEHOLDER_${index}]`;
  });
  
  // Extract plain text without images/HTML
  const plainText = contentWithPlaceholders
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&[a-z]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) {
    throw new Error('Content is empty');
  }

  const prompt = `Reformulate the following briefing content to be:
- Concise and impactful
- Professional and formal in tone
- Appropriate for a UN morning briefing
- Well-structured with clear paragraphs
- Free of redundancy
- Do not generate a heading, but keep subheadings already present in the text.

IMPORTANT: The text contains image placeholders in the format [IMAGE_PLACEHOLDER_0], [IMAGE_PLACEHOLDER_1], etc.
You MUST keep these placeholders exactly where they are in the text. Do not move, remove, or alter them.
Reformulate only the text around these placeholders.

Maintain all key facts and details, but improve clarity and readability.
Return ONLY the reformulated text with placeholders preserved, no explanations.

Original content:
${plainText}`;

  try {
    const { text: reformulatedText } = await generateText({
      model: azure('gpt-4o'),
      prompt,
    });
    
    // Convert reformulated text to TipTap HTML format
    let reformulatedHtml = plainTextToTipTapHtml(reformulatedText.trim());
    
    // Re-insert images at their placeholder positions
    images.forEach((img, index) => {
      const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
      // The placeholder might be wrapped in <p> tags after conversion, so handle that
      const placeholderInP = `<p>${placeholder}</p>`;
      reformulatedHtml = reformulatedHtml.replace(placeholderInP, img);
      // Also try without the <p> tags in case they weren't added
      reformulatedHtml = reformulatedHtml.replace(placeholder, img);
    });
    
    return reformulatedHtml;
  } catch (error) {
    console.error('[AI SERVICE] Reformulation error:', error);
    if (error instanceof Error) {
      throw new Error(`Reformulation failed: ${error.message}`);
    }
    throw new Error('Failed to reformulate content');
  }
}
