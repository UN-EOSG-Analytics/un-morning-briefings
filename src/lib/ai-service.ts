import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CATEGORIES, PRIORITIES, REGIONS, COUNTRIES } from '@/types/morning-meeting';

interface AutoFillResult {
  category: string;
  priority: 'sg-attention' | 'situational-awareness';
  region: string;
  country: string | string[];
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
  const countryList = COUNTRIES.join(', ');
  
  const prompt = `Create a JSON object to auto-fill the fields of a UN Morning Meeting briefing entry based on the provided content, which will be pasted from a news source

Content: ${content}

COUNTRY SELECTION (STRICT):
- Extract ONLY countries explicitly mentioned in the content (use the name from the provided country list)
- If ONE country is mentioned, return as a string (e.g., "France")
- If MULTIPLE countries are mentioned and involved in the topic, return as an array (e.g., ["France", "Germany"])
- If no specific country is mentioned, return empty string
- Do NOT infer or assume countries based on context

FORMATTING INSTRUCTIONS FOR "entry" FIELD:
Output must be valid HTML only. Do not use Markdown.
GENERAL RULES:
Preserve all facts, wording, and quotes exactly as in the source content
Do not add, remove, paraphrase, or reinterpret any information
Do not include commentary, explanations, or summaries outside the content
Do not include empty HTML tags

SECTION STRUCTURE:
Each thematic section must start with:
<p><strong>Section Title:</strong></p>
Immediately after a section title:
Use a <ul> if the section contains multiple points
Use a single <p> only if there is one standalone statement
The majority of the text should be written text, not bullet point lists. use them wisely.
LISTS:
Bullet points must always follow this exact structure:
<ul> <li><p>Bullet text here.</p></li> </ul>
Do not place text directly inside <li> without a <p>
Do not use numbered lists unless the source content is explicitly sequential
PARAGRAPHS:
All non-list content must be wrapped in <p> tags
Do not combine unrelated ideas into a single paragraph
EMPHASIS:
Use <strong> only for:
Section titles
Clearly emphasized terms already implied by the content
Do not overuse <strong>
QUOTES:
Direct quotes must be wrapped in:
<blockquote> <p>"Exact quote here."</p> </blockquote> and should be in their own, seperate line. Do not put them in bullet point lists and don't include every single quote but 2-3 key quotes relevant to the content.
PROHIBITED:
Markdown syntax (e.g. bold, > quote, - bullets)
Mixed formatting styles
HTML headings (<h1>–<h6> blocks)
Inline or compressed bullet lists

Categories: ${categoryList}
Priorities: ${priorityList}
Regions: ${regionList}
Countries: ${countryList}

Now, return the JSON:
{
  "category": "best matching category from list - ONLY if clearly supported by content",
  "priority": "sg-attention or situational-awareness - ONLY if explicitly indicated in content",
  "region": "best matching region from list - ONLY if content explicitly relates to this region",
  "country": "best matching countries from list, or left empty if no countries involved",
  "headline": "concise headline (max 300 chars) - derived directly from content, not invented",
  "sourceDate": "YYYY-MM-DD if explicitly stated in content, otherwise null",
  "entry": "reorganized content with formatting as defined above"
}`;

  try {
    const { text } = await generateText({
      model: azure('gpt-4o'),
      prompt,
    });
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);
    
    return {
      category: parsed.category || '',
      priority: parsed.priority || 'situational-awareness',
      region: parsed.region || '',
      country: parsed.country || '',
      headline: parsed.headline || '',
      date: parsed.date,
      entry: parsed.entry || content,
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
- Do not invent any additional information or interpret / analyze the content

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
    let reformulatedHtml = reformulatedText.trim();    
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
