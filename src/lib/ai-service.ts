import { createAzure } from "@ai-sdk/azure";
import { generateText } from "ai";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  CATEGORIES,
  PRIORITIES,
  REGIONS,
  COUNTRIES,
} from "@/types/morning-meeting";

interface AutoFillResult {
  category: string;
  priority: "sg-attention" | "situational-awareness";
  region: string;
  country: string | string[];
  headline: string;
  date?: string;
  entry: string;
  sourceDate?: string;
  sourceName?: string;
}

// Initialize Azure OpenAI client
const azure = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  resourceName: process.env.AZURE_OPENAI_ENDPOINT?.replace(
    "https://",
    "",
  ).replace(".openai.azure.com/", ""),
});

// Maximum input content length to prevent abuse (100KB)
const MAX_CONTENT_LENGTH = 100_000;

export async function autoFillFromContent(
  content: string,
): Promise<AutoFillResult> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file",
    );
    throw new Error(
      "AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.",
    );
  }

  // Truncate excessively long content
  const safeContent = content.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : content;

  // Build lists for the prompt
  const categoryList = CATEGORIES.join(", ");
  const priorityList = PRIORITIES.map((p) => p.value).join(", ");
  const regionList = REGIONS.join(", ");
  const countryList = COUNTRIES.join(", ");

  const systemPrompt = `You are a UN briefing assistant. Create a JSON object to auto-fill the fields of a UN Morning Meeting briefing entry based on provided news content.

CRITICAL INSTRUCTION FOR "entry" FIELD:
You MUST preserve ALL content from the original article. Extract and include the COMPLETE article text in its entirety.
ONLY remove:
- Author information and bylines
- Navigation elements
- Advertisement content
- Sidebar material
- Website boilerplate (privacy notices, cookie notices, author bios, timestamps)
- Comments sections
- Related article teasers
- Duplicate content

KEEP everything else: all paragraphs, sentences, facts, quotes, details, statistics, analysis - the entire full article as written.

FORMATTING & STRUCTURE (Apply intelligently while preserving all original content):
Output must be valid HTML only. Do not use Markdown.

INTELLIGENT FORMATTING RULES:
1. PRESERVE ALL WORDS: Do not change, remove, paraphrase, or condense any original text
2. ADD STRUCTURE intelligently:
   - Identify natural section breaks in the article and create section headers
   - Recognize when content naturally groups into lists and format accordingly
   - Add emphasis to key terms, names, events that are important to the story
   - Extract and highlight important quotes in blockquotes
   - Keep logical paragraph grouping for readability

SECTION HEADERS:
- Identify major topics/themes in the article and label them as section headers
- Format as: <h3>Section Title in Title Case</h3>
- Only use 1-2 word headers that summarize the section (e.g., "Background", "Key Details", "International Response")
- Place sections logically to group related content

PARAGRAPHS:
- Wrap all flowing text content in <p>...</p> tags
- Keep paragraph breaks logical and readable
- Maintain the flow and logic of the original article

LISTS:
- If the article contains naturally grouped items/points, format as a list:
  <ul> <li><p>Item text here.</p></li> <li><p>Next item.</p></li> </ul>
- Only create lists when the original content naturally groups items
- Do not convert running text into bullet points; only use lists for already-grouped content
- Do not place text directly inside <li> without a <p>

EMPHASIS & BOLD:
- Use <strong> for:
  * Key figures, officials, or important names mentioned for the first time
  * Critical dates, events, or turning points
  * Important statistics or data points
  * Terms crucial to understanding the story (e.g., "ceasefire agreement", "humanitarian crisis")
  * Words/phrases already naturally emphasized in the source
- Balance emphasis - do not over-bold; approximately 5-10% of content should be bolded

QUOTES:
- Important direct quotes from the source should be formatted as:
  <blockquote> <p>"Exact quote here."</p> </blockquote>
- Place quotes on separate lines
- Select 2-5 key quotes that capture important moments, statements, or perspectives
- Do NOT change any words in quotes
- Do NOT add quotes that weren't in the original

CONTENT PRESERVATION RULES (CRITICAL):
- Preserve ALL facts, original wording, and quotes EXACTLY as in the source content
- Do NOT summarize, condense, or shorten the article
- Do NOT add, remove, or reinterpret any information
- Do NOT include editorial commentary outside the original content
- Do NOT omit details, background information, or supporting facts
- Include full context for all statements and events
- Keep all statistics, data, and specific information
- Do not include empty HTML tags

PROHIBITED:
- Markdown syntax
- HTML headings (<h1>, <h2>, <h4>–<h6>) - only use <h3> for section headers
- Paraphrasing or shortening of original text
- Omission of article content
- Adding words or phrases not in the original
- Author information, bylines, or author bios

Categories: ${categoryList}
Priorities: ${priorityList}
Regions: ${regionList}
Countries: ${countryList}

COUNTRY SELECTION (STRICT):
- Extract ONLY countries explicitly mentioned in the content (use the name from the provided country list)
- If ONE country is mentioned, return as a string (e.g., "France")
- If MULTIPLE countries are mentioned and involved in the topic, return as an array (e.g., ["France", "Germany"])
- If no specific country is mentioned, return empty string
- Do NOT infer or assume countries based on context

SOURCE NAME EXTRACTION:
- Extract the name of the news source or publication (e.g., "BBC", "Reuters", "The Guardian", "AFP")
- Look for attribution phrases like "(Source Name)", "via Source Name", "Source Name reported", or similar
- If no explicit source is mentioned, leave sourceName empty

Return ONLY valid JSON with these fields:
{
  "category": "best matching category from list - ONLY if clearly supported by content",
  "priority": "sg-attention or situational-awareness - ONLY if explicitly indicated in content",
  "region": "best matching region from list - ONLY if content explicitly relates to this region",
  "country": "best matching countries from list, or left empty if no countries involved",
  "headline": "concise headline (max 300 chars) - derived directly from content, not invented",
  "sourceDate": "YYYY-MM-DD if explicitly stated in content, otherwise null",
  "sourceName": "name of news source/publication if mentioned, otherwise empty string",
  "entry": "COMPLETE FULL ARTICLE with all original content preserved, intelligently formatted with headers, bold emphasis, proper paragraphs, lists, and blockquotes as appropriate"
}`;

  try {
    const { text } = await generateText({
      model: azure("gpt-4o"),
      system: systemPrompt,
      prompt: safeContent,
    });

    // Remove markdown code blocks if present
    const jsonText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(jsonText);

    return {
      category: parsed.category || "",
      priority: parsed.priority || "situational-awareness",
      region: parsed.region || "",
      country: parsed.country || "",
      headline: parsed.headline || "",
      date: parsed.date,
      entry: parsed.entry || content,
      sourceDate: parsed.sourceDate || "",
      sourceName: parsed.sourceName || "",
    };
  } catch (error) {
    console.error("[AI SERVICE] Error details:", error);
    if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error("Failed to process content with AI");
  }
}

/**
 * Generate a concise bullet-point summary of the briefing content
 */
export async function generateSummary(content: string): Promise<string[]> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file",
    );
    throw new Error(
      "AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.",
    );
  }

  // Extract plain text from HTML
  const plainText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    throw new Error("Content is empty");
  }

  const prompt = `Create a concise executive summary of this briefing in 3-5 key bullet points.
Each bullet should be:
- One clear, complete sentence
- Focused on the most critical information
- Professional and suitable for UN leadership
- Maximum 20 words each
- Do not invent any additional information or interpret / analyze the content

Return ONLY the bullet points, one per line, without bullet symbols or numbering.`;

  // Truncate excessively long content
  const safeContent = plainText.length > MAX_CONTENT_LENGTH
    ? plainText.slice(0, MAX_CONTENT_LENGTH)
    : plainText;

  try {
    const { text } = await generateText({
      model: azure("gpt-4o"),
      system: prompt,
      prompt: safeContent,
    });

    // Split into lines and clean up
    const bullets = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
      .filter((line) => line.length > 0);

    return bullets;
  } catch (error) {
    console.error("[AI SERVICE] Summary generation error:", error);
    if (error instanceof Error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
    throw new Error("Failed to generate summary");
  }
}

/**
 * Reformulate a selected portion of text while keeping it coherent with the full sentence
 * Takes the full sentence for context and returns only the reformulated selection
 */
export async function reformulateSelection(
  fullSentence: string,
  selectionStart: number,
  selectionEnd: number,
): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file",
    );
    throw new Error(
      "AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.",
    );
  }

  // Extract the parts
  const beforeText = fullSentence.substring(0, selectionStart);
  const selectedText = fullSentence.substring(selectionStart, selectionEnd);
  const afterText = fullSentence.substring(selectionEnd);

  // Check if we're reformulating the entire text (no context)
  const isFullText =
    selectionStart === 0 && selectionEnd === fullSentence.length;

  let prompt: string;

  if (isFullText) {
    // Direct reformulation without context markers
    prompt = `Reformulate this UN briefing text to be more concise and professional.

Text to reformulate:
"${selectedText}"

Guidelines:
- Make it concise, clear, and professional, neutral reporting style
- Do not change the meaning or add analysis
- Maintain all key facts and information
- Use formal UN briefing tone
- Preserve any paragraph breaks if present (output multiple paragraphs separated by double newlines)

CRITICAL: Output ONLY your rewritten version of the text. Do not include:
- Quotes around your answer
- Explanations or comments
- Introductory phrases like "Here is..."

Your reformulated text:`;
  } else {
    // Reformulation with context
    prompt = `Reformulate the selected portion of this UN briefing text to be more concise and professional.

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
  }

  try {
    // Calculate appropriate token limit based on input length
    const estimatedTokens = Math.max(800, Math.ceil(selectedText.length / 2));

    const { text: reformulatedText } = await generateText({
      model: azure("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: estimatedTokens,
    });

    // Clean up response
    const cleanedText = reformulatedText
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "") // Remove surrounding quotes
      .replace(/^(Here is|Here's|The rewritten|Rewritten)[:\s]*/i, "") // Remove meta prefixes
      .trim();

    // Validate response isn't meta-commentary
    const metaPatterns = [
      /^(Wait|Note|Context|Explanation|I would|I will|Let me|The text|This)/i,
      /<<<START SELECTION>>>/,
      /<<<END SELECTION>>>/,
    ];

    for (const pattern of metaPatterns) {
      if (pattern.test(cleanedText)) {
        console.warn("[AI SERVICE] AI returned invalid response format");
        return selectedText;
      }
    }

    // If empty, return original
    if (!cleanedText) {
      console.warn("[AI SERVICE] AI response empty, using original text");
      return selectedText;
    }

    return cleanedText;
  } catch (error) {
    console.error("[AI SERVICE] Selection reformulation error:", error);
    if (error instanceof Error) {
      throw new Error(`Reformulation failed: ${error.message}`);
    }
    throw new Error("Failed to reformulate selected text");
  }
}

/**
 * Reformulate text to be concise, professional, and appropriate for a UN briefing
 * PRESERVES the exact HTML/TipTap structure - only reformulates text content within tags
 * Does not change meaning, add analysis, or modify formatting
 */
export async function reformulateBriefing(content: string): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "[AI SERVICE] AZURE_OPENAI_API_KEY is not configured in .env file",
    );
    throw new Error(
      "AZURE_OPENAI_API_KEY is not configured. Please add it to your .env file.",
    );
  }

  // Extract text segments while preserving HTML structure
  // We'll replace text content with placeholders, reformulate, then put back
  const textSegments: string[] = [];
  let htmlTemplate = content;

  // Match text content between HTML tags (but not inside tag attributes)
  // This regex captures text that is between > and < (the actual content)
  const textContentRegex = />((?:(?!<)[^>])+)</g;

  htmlTemplate = content.replace(textContentRegex, (match, textContent) => {
    const trimmedText = textContent.trim();
    // Only process non-empty text that isn't just whitespace or HTML entities
    if (trimmedText && !/^(&nbsp;|\s)*$/.test(trimmedText)) {
      const index = textSegments.length;
      textSegments.push(trimmedText);
      // Preserve the original whitespace around the placeholder
      const leadingSpace = textContent.match(/^\s*/)?.[0] || "";
      const trailingSpace = textContent.match(/\s*$/)?.[0] || "";
      return `>${leadingSpace}[TEXT_${index}]${trailingSpace}<`;
    }
    return match;
  });

  // If no text segments found, return original content
  if (textSegments.length === 0) {
    return content;
  }

  // Create a mapping for the AI to reformulate
  const textMapping = textSegments
    .map((text, index) => `[TEXT_${index}]: ${text}`)
    .join("\n");

  const prompt = `You are a UN briefing editor. Your task is to ONLY improve the wording of text segments while keeping their exact meaning.

STRICT RULES:
- ONLY improve word choice and sentence flow
- Do NOT change the meaning of any text
- Do NOT add new information or analysis
- Do NOT remove any facts or details
- Do NOT change proper nouns, names, dates, numbers, or statistics
- Keep the same general length (do not significantly expand or reduce)
- Maintain professional UN diplomatic tone

Here are the text segments to reformulate. Return ONLY the reformulated versions in the exact same format:

${textMapping}

Return your response in EXACTLY this format (one per line, preserving the [TEXT_N] markers):
[TEXT_0]: reformulated text here
[TEXT_1]: reformulated text here
...and so on for each segment.

Do NOT include any other text, explanations, or formatting.`;

  try {
    const { text: reformulatedText } = await generateText({
      model: azure("gpt-4o"),
      prompt,
    });

    // Parse the AI response to extract reformulated segments
    const reformulatedSegments = new Map<number, string>();
    const responseLines = reformulatedText.trim().split("\n");

    for (const line of responseLines) {
      const match = line.match(/^\[TEXT_(\d+)\]:\s*(.+)$/);
      if (match) {
        const index = parseInt(match[1], 10);
        const text = match[2].trim();
        reformulatedSegments.set(index, text);
      }
    }

    // Replace placeholders with reformulated text in the HTML template
    let result = htmlTemplate;
    for (let i = 0; i < textSegments.length; i++) {
      const placeholder = `[TEXT_${i}]`;
      // Use the reformulated text if available, otherwise keep original
      const newText = reformulatedSegments.get(i) || textSegments[i];
      result = result.replace(placeholder, newText);
    }

    return result;
  } catch (error) {
    console.error("[AI SERVICE] Reformulation error:", error);
    if (error instanceof Error) {
      throw new Error(`Reformulation failed: ${error.message}`);
    }
    throw new Error("Failed to reformulate content");
  }
}