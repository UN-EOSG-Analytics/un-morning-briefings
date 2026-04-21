import { AzureOpenAI } from "openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import {
  CATEGORIES,
  PRIORITIES,
  REGIONS,
  COUNTRIES,
} from "@/types/morning-meeting";
import type { EntrySource } from "@/types/morning-meeting";

interface AutoFillResult {
  category: string;
  priority: string;
  region: string;
  country: string | string[];
  headline: string;
  date?: string;
  entry: string;
  sources?: EntrySource[];
}

const MODEL = "gpt-5.4-mini";

let _client: AzureOpenAI | null = null;
function getClient(): AzureOpenAI {
  if (!_client) {
    // Read env vars here (in app code) so Next.js/Turbopack injects them correctly.
    // The SDK reading process.env from inside node_modules can be unreliable with Turbopack.
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!endpoint) throw new Error("AZURE_OPENAI_ENDPOINT is not set");
    if (!apiKey) throw new Error("AZURE_OPENAI_API_KEY is not set");
    _client = new AzureOpenAI({ apiVersion: "2025-04-01-preview", endpoint, apiKey });
  }
  return _client;
}

// Maximum input content length to prevent abuse (100KB)
const MAX_CONTENT_LENGTH = 100_000;

function truncate(text: string): string {
  return text.length > MAX_CONTENT_LENGTH
    ? text.slice(0, MAX_CONTENT_LENGTH)
    : text;
}

// Shared chat completion helper
async function chat(
  system: string,
  prompt: string,
  options?: {
    responseFormat?: ChatCompletionCreateParams["response_format"];
  },
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    reasoning_effort: "low",
    messages: [
      { role: "developer", content: system },
      { role: "user", content: prompt },
    ],
    ...(options?.responseFormat && { response_format: options.responseFormat }),
  });

  return response.choices[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Auto-fill: metadata extraction (structured) + article formatting (free-form)
// ---------------------------------------------------------------------------

const categoryValues = CATEGORIES as unknown as string[];
const priorityValues = PRIORITIES.map((p) => p.value);
const regionValues = REGIONS as unknown as string[];
const countryValues = COUNTRIES as unknown as string[];

const metadataJsonSchema = {
  type: "object" as const,
  properties: {
    category: {
      anyOf: [{ type: "string" as const, enum: categoryValues }, { type: "null" as const }],
      description:
        "Best matching category — only if clearly supported by content, otherwise null",
    },
    priority: {
      anyOf: [{ type: "string" as const, enum: priorityValues }, { type: "null" as const }],
      description:
        "Priority level — only if explicitly indicated in content, otherwise null",
    },
    region: {
      anyOf: [{ type: "string" as const, enum: regionValues }, { type: "null" as const }],
      description:
        "Best matching region — only if content explicitly relates to this region, otherwise null",
    },
    country: {
      anyOf: [
        { type: "string" as const },
        { type: "array" as const, items: { type: "string" as const } },
        { type: "null" as const },
      ],
      description:
        "Countries explicitly mentioned — single string for one, array for multiple, null if none",
    },
    headline: {
      type: "string" as const,
      description:
        "Concise UN-style headline (max 120 chars), subject + action, no leading article",
    },
    sources: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: {
            type: ["string" as const, "null" as const],
            description: "Name of news source/publication (e.g. BBC, Reuters)",
          },
          date: {
            type: ["string" as const, "null" as const],
            description: "YYYY-MM-DD if explicitly stated, otherwise null",
          },
        },
        required: ["name", "date"],
        additionalProperties: false,
      },
      description:
        "Sources mentioned in the content. One object per distinct source/publication.",
    },
  },
  required: [
    "category",
    "priority",
    "region",
    "country",
    "headline",
    "sources",
  ],
  additionalProperties: false,
};

async function extractMetadata(content: string) {
  const systemPrompt = `You are a metadata extraction assistant for the UN Executive Office of the Secretary-General (EOSG). Classify and tag the provided news or document content for the daily morning briefing.

CATEGORY — choose the best fit:
- "Article": news article, press report, or media coverage (most common)
- "Meeting Note": record or summary of a meeting
- "Code Cable": UN internal cable communication
- "Situational Update": ongoing crisis or situation report
- "UN Internal Document": internal UN memo, report, or official document
- "Other": does not fit any of the above

PRIORITY — always set one:
- "SG's attention": high-stakes developments directly relevant to the Secretary-General — major conflicts, diplomatic crises, Security Council actions, senior UN leadership decisions, significant humanitarian emergencies
- "Situational Awareness": everything else — background news, routine updates, general awareness items (use this as the default)

REGION — pick the single most relevant region:
- "Africa", "The Americas", "Asia and the Pacific", "Europe", "Middle East"
- "Thematic updates": cross-regional or global topics (climate, human rights, UN system-wide issues, etc.)
- null only if truly no region can be determined

COUNTRY — countries that are primary subjects of the content:
- Use exact names from this list: ${countryValues.join(", ")}
- Return a single string if one country, an array if multiple are central to the topic
- null if the content is global/regional with no specific country focus
- Do NOT include countries merely mentioned in passing

HEADLINE — concise, factual, telegraphic UN-style title (max 120 characters). Lead with the subject and action (e.g., "Security Council adopts resolution on Sudan ceasefire"). No articles ("the", "a") at the start.

SOURCE DATE — YYYY-MM-DD if a publication or event date is explicitly stated in the content, otherwise null.

SOURCE NAME — name of the news outlet or originating organisation (e.g., "Reuters", "BBC", "AFP", "Al Jazeera"). Look for bylines, datelines, or attribution phrases. null if not mentioned.`;

  const text = await chat(systemPrompt, content, {
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "metadata",
        strict: true,
        schema: metadataJsonSchema,
      },
    },
  });

  return JSON.parse(text);
}

async function formatArticle(content: string): Promise<string> {
  const systemPrompt = `You are a UN briefing assistant. Format the provided news content as clean HTML for a briefing entry.

CRITICAL: Preserve ALL content from the original article in its entirety.
ONLY remove: author information/bylines, navigation, ads, sidebars, website boilerplate, comments, related article teasers, duplicate content.
KEEP everything else: all paragraphs, sentences, facts, quotes, details, statistics, analysis.

FORMATTING RULES:
1. PRESERVE ALL WORDS: Do not change, remove, paraphrase, or condense any original text
2. ADD STRUCTURE intelligently:
   - Identify natural section breaks and create headers
   - Recognize when content naturally groups into lists
   - Add emphasis to key terms, names, events
   - Extract and highlight important quotes in blockquotes

SECTION HEADERS:
- Format as: <h3>Section Title in Title Case</h3>
- Only use 1-2 word headers (e.g., "Background", "Key Details", "International Response")

PARAGRAPHS: Wrap all flowing text in <p>...</p> tags

LISTS:
- <ul> <li><p>Item text here.</p></li> </ul>
- Only create lists when content naturally groups items
- Do not place text directly inside <li> without a <p>

EMPHASIS: Use <strong> for key figures, critical dates, important statistics, crucial terms. ~5-10% of content.

QUOTES: <blockquote> <p>"Exact quote here."</p> </blockquote> — select 2-5 key quotes, do NOT change words.

PROHIBITED: Markdown syntax, headings other than <h3>, paraphrasing, omission, adding words not in original, author information.

Output ONLY the formatted HTML. No explanation, no wrapping.`;

  return chat(systemPrompt, content);
}

export async function autoFillFromContent(
  content: string,
): Promise<AutoFillResult> {
  const safeContent = truncate(content);

  try {
    const [metadata, entry] = await Promise.all([
      extractMetadata(safeContent),
      formatArticle(safeContent),
    ]);

    return {
      category: metadata.category || "",
      priority: metadata.priority || "Situational Awareness",
      region: metadata.region || "",
      country: metadata.country || "",
      headline: metadata.headline || "",
      entry: entry || content,
      sources: Array.isArray(metadata.sources)
        ? metadata.sources.filter((s: EntrySource) => s.name || s.date)
        : [],
    };
  } catch (error) {
    console.error("[AI SERVICE] Error details:", error);
    if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error("Failed to process content with AI");
  }
}

// ---------------------------------------------------------------------------
// Summary generation (structured array output)
// ---------------------------------------------------------------------------

export async function generateSummary(content: string): Promise<string[]> {
  // Extract plain text from HTML
  const plainText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    throw new Error("Content is empty");
  }

  const safeContent = truncate(plainText);

  try {
    const text = await chat(
      `Create a concise executive summary of this briefing in 3-5 key bullet points.
Each bullet should be:
- One clear, complete sentence
- Focused on the most critical information
- Professional and suitable for UN leadership
- Maximum 20 words each
- Do not invent any additional information or interpret / analyze the content`,
      safeContent,
      {
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "3-5 bullet points, each a clear complete sentence, max 20 words",
                },
              },
              required: ["bullets"],
              additionalProperties: false,
            },
          },
        },
      },
    );

    return JSON.parse(text).bullets;
  } catch (error) {
    console.error("[AI SERVICE] Summary generation error:", error);
    if (error instanceof Error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
    throw new Error("Failed to generate summary");
  }
}

// ---------------------------------------------------------------------------
// Reformulation (unified HTML-preserving approach with structured output)
// ---------------------------------------------------------------------------

export async function reformulateHtml(content: string): Promise<string> {
  // Extract text segments while preserving HTML structure
  const textSegments: string[] = [];
  const textContentRegex = />((?:(?!<)[^>])+)</g;

  const htmlTemplate = content.replace(
    textContentRegex,
    (match, textContent: string) => {
      const trimmedText = textContent.trim();
      if (trimmedText && !/^(&nbsp;|\s)*$/.test(trimmedText)) {
        const index = textSegments.length;
        textSegments.push(trimmedText);
        const leadingSpace = textContent.match(/^\s*/)?.[0] || "";
        const trailingSpace = textContent.match(/\s*$/)?.[0] || "";
        return `>${leadingSpace}[TEXT_${index}]${trailingSpace}<`;
      }
      return match;
    },
  );

  if (textSegments.length === 0) {
    return content;
  }

  const textMapping = textSegments
    .map((text, index) => `${index}: ${text}`)
    .join("\n");

  // Build a schema with exact keys for each segment
  const properties: Record<string, { type: "string" }> = {};
  for (let i = 0; i < textSegments.length; i++) {
    properties[String(i)] = { type: "string" };
  }

  try {
    const text = await chat(
      `You are a UN briefing editor. Reformulate each text segment.

Guidelines:
- Make it concise, clear, and professional, neutral reporting style
- Do not change the meaning or add analysis
- Maintain all key facts and information
- Use formal UN briefing tone

Strict rules:
- Do NOT change proper nouns, names, dates, numbers, or statistics
- Keep the same general length (do not significantly expand or reduce)

Return a JSON object mapping each segment index to its reformulated text.`,
      textMapping,
      {
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "segments",
            strict: true,
            schema: {
              type: "object",
              properties,
              required: Object.keys(properties),
              additionalProperties: false,
            },
          },
        },
      },
    );

    const reformulated: Record<string, string> = JSON.parse(text);

    // Reassemble HTML with reformulated segments
    let result = htmlTemplate;
    for (let i = 0; i < textSegments.length; i++) {
      const placeholder = `[TEXT_${i}]`;
      const newText = reformulated[String(i)] || textSegments[i];
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
