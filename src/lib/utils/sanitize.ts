import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags commonly used in rich text editors.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "del",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ["target"],
  });
}

/**
 * Sanitize HTML and strip inline color styles.
 * Used by dark-background themes where inline color:rgb(0,0,0) makes text invisible.
 */
export function sanitizeHtmlStripColors(html: string): string {
  const sanitized = sanitizeHtml(html);
  // Remove color declarations from inline styles, keep other styles (font-size etc)
  return sanitized.replace(/color\s*:\s*[^;"]+(;|(?="))/gi, "");
}

/**
 * Sanitize plain text - strip all HTML tags
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
