import sanitize from "sanitize-html";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags used in the rich text editor while stripping
 * dangerous elements like <script>, event handlers, etc.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;
  return sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "sub",
      "sup",
      "mark",
      "s",
      "del",
      "code",
      "pre",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto", "image-ref"],
  });
}
