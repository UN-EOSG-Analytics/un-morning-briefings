import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES, PRIORITIES, REGIONS, COUNTRIES_BY_REGION } from '@/types/morning-meeting';

interface AutoFillResult {
  category: string;
  priority: 'sg-attention' | 'situational-awareness';
  region: string;
  country: string;
  headline: string;
  date: string;
  entry: string;
}

export async function autoFillFromContent(content: string): Promise<AutoFillResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[GEMINI SERVICE] GEMINI_API_KEY is not configured in .env file');
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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

Return JSON:
{
  "category": "best matching category from list",
  "priority": "sg-attention or situational-awareness",
  "region": "best matching region from list",
  "country": "specific country name",
  "headline": "concise headline (max 120 chars)",
  "date": "YYYY-MM-DD format",
  "entry": "cleaned main content with logical paragraph breaks"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
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
      date: parsed.date || new Date().toISOString().split('T')[0],
      entry: entryHtml,
    };
  } catch (error) {
    console.error('[GEMINI SERVICE] Error details:', error);
    if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error('Failed to process content with AI');
  }
}

/**
 * Convert plain text to TipTap HTML format
 * Handles paragraph breaks, multiple spaces, and basic structure
 */
function plainTextToTipTapHtml(text: string): string {
  if (!text) return '<p></p>';
  
  // Split by double newlines (paragraph breaks)
  const paragraphs = text
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(para => para.length > 0);
  
  // Wrap each paragraph in <p> tags and escape special HTML chars
  const htmlParagraphs = paragraphs
    .map(para => {
      // Escape HTML special characters
      const escaped = para
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // Replace single newlines with <br> for line breaks within paragraphs
      const withLineBreaks = escaped.replace(/\n/g, '<br>');
      
      return `<p>${withLineBreaks}</p>`;
    })
    .join('');
  
  return htmlParagraphs || '<p></p>';
}

/**
 * Generate a concise bullet-point summary of the briefing content
 */
export async function generateSummary(content: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[GEMINI SERVICE] GEMINI_API_KEY is not configured in .env file');
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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
- Maximum 25 words each

Return ONLY the bullet points, one per line, without bullet symbols or numbering.

Content:
${plainText}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Split into lines and clean up
    const bullets = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return bullets;
  } catch (error) {
    console.error('[GEMINI SERVICE] Summary generation error:', error);
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
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[GEMINI SERVICE] GEMINI_API_KEY is not configured in .env file');
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use flash model for fast responses
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400, // Allow complete responses
    }
  });

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let reformulatedText = response.text().trim();
    
    // Clean up response
    reformulatedText = reformulatedText
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
      if (pattern.test(reformulatedText)) {
        console.warn('[GEMINI SERVICE] AI returned invalid response format');
        return selectedText;
      }
    }
    
    // If empty or suspiciously long, return original
    if (!reformulatedText || reformulatedText.length > selectedText.length * 3) {
      console.warn('[GEMINI SERVICE] AI response invalid, using original text');
      return selectedText;
    }
    
    return reformulatedText;
  } catch (error) {
    console.error('[GEMINI SERVICE] Selection reformulation error:', error);
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
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[GEMINI SERVICE] GEMINI_API_KEY is not configured in .env file');
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reformulatedText = response.text().trim();
    
    // Convert reformulated text to TipTap HTML format
    let reformulatedHtml = plainTextToTipTapHtml(reformulatedText);
    
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
    console.error('[GEMINI SERVICE] Reformulation error:', error);
    if (error instanceof Error) {
      throw new Error(`Reformulation failed: ${error.message}`);
    }
    throw new Error('Failed to reformulate content');
  }
}
