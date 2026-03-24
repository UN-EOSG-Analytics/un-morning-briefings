# Tiptap Content Storage: Decision Record

## Current Format: HTML

The `entries.entry` column stores HTML strings produced by `editor.getHTML()`. Images use `image-ref://img-N` placeholder URLs in the database; these are resolved to data URLs at read time.

## Why HTML (not JSON)

We evaluated storing Tiptap's ProseMirror JSON instead of (or alongside) HTML. **HTML was chosen as the primary format** for these reasons:

1. **All consumers need HTML** — view dialogs (`dangerouslySetInnerHTML`), DOCX export (`parseHtmlContent`), AI features (regex-strip tags), email attachments
2. **Editor-agnostic** — any rich text editor can produce/consume HTML, avoiding Tiptap lock-in
3. **Full-text search works on HTML** — PostgreSQL `tsvector` operates on stripped plain text; the source format (HTML vs JSON) is irrelevant
4. **Vector embeddings work on HTML** — embeddings always operate on plain text; stripping HTML tags is trivial
5. **Simpler pipeline** — one format through the entire stack, no dual-write or sync concerns

## Roundtrip: HTML ↔ JSON is lossless

If we ever need ProseMirror JSON (e.g., for structured content queries or a mobile app), the conversion is **lossless** with our extension set:

```ts
import { generateJSON, generateHTML } from '@tiptap/html-utility'

const json = generateJSON(htmlString, extensions)  // HTML → JSON
const html = generateHTML(json, extensions)         // JSON → HTML
```

All extensions (StarterKit, Link, TextAlign, Highlight, Image with data-width/data-height, CommentMark) define bijective `parseHTML`/`renderHTML` mappings. CSS classes from `HTMLAttributes` config (e.g., `editor-image rounded`) are not stored in JSON but are re-applied automatically on render.

A batch migration script could convert all existing entries at any time.

## Infrastructure for Future Analysis

Two columns were added to `entries` (migration `001_fts_and_text_content.sql`):

| Column | Type | Purpose |
|---|---|---|
| `text_content` | `TEXT` | Plain text extracted from HTML (tags stripped, images removed, whitespace normalized). Ready for embedding pipelines. |
| `search_vector` | `TSVECTOR` | Weighted full-text search vector. Headline = weight A, body = weight B. GIN-indexed. |

**`text_content`** is populated by the application layer (`stripHtmlToText()` in `entry-queries.ts`) on every INSERT/UPDATE through the API routes. This avoids fragile regex-based HTML parsing in SQL.

**`search_vector`** is auto-maintained by a `BEFORE INSERT OR UPDATE` trigger (`entries_fts_update`) that builds the tsvector from `headline` + `text_content`. The trigger only recomputes when `text_content` or `headline` actually change.

### Search query pattern

```sql
SELECT id, headline, ts_rank(search_vector, query) AS rank
FROM morning_briefings.entries, to_tsquery('english', $1) query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Embedding pattern

```sql
SELECT id, text_content FROM morning_briefings.entries;
-- Feed text_content directly to embedding API — no HTML stripping needed
```

## Extensions in Use

| Extension | Stored HTML | Notes |
|---|---|---|
| StarterKit | `<p>`, `<strong>`, `<em>`, `<s>`, `<code>`, `<h1>`–`<h3>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<pre>`, `<hr>` | Standard Tiptap |
| Link | `<a href="...">` | autolink enabled |
| TextAlign | `style="text-align: ..."` on `<p>`, `<h*>` | |
| Highlight | `<mark>` with `data-color` | multicolor |
| Image | `<img src="image-ref://img-N" data-width="..." data-height="...">` | Base64 on client, refs in DB |
| CommentMark | `<mark data-comment="...">` | Custom extension |

## Image Pipeline

1. **Editor** → base64 `data:` URLs in `<img src>`
2. **Save** (`storage.ts`) → extracts base64, replaces with `image-ref://img-N`, sends images separately
3. **Database** → HTML contains `image-ref://img-N` references; actual blobs in Azure/local storage; metadata in `images` table
4. **Read** → server-side or client-side conversion back to `data:` URLs before display

## Sanitization Note

`sanitizeHtml()` (DOMPurify) strips `data-*` attributes on read. This means `data-comment` and `data-width`/`data-height` are lost in view rendering but preserved in the database and available to DOCX export (which reads DOM before sanitization).
