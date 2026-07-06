const RICH_TAG_RE = /<\/?(b|strong|i|em|u|p|br|ul|ol|li|blockquote|div)\b/i;
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "p", "br", "ul", "ol", "li", "blockquote", "div"]);
const DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math"]);

export function hasRichTextMarkup(value = "") {
  return RICH_TAG_RE.test(String(value || ""));
}

export function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainTextToHtml(value = "") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase();
  if (DROP_TAGS.has(tag)) return "";

  const children = Array.from(node.childNodes).map(cleanNode).join("");
  if (!ALLOWED_TAGS.has(tag)) return children;
  if (tag === "br") return "<br />";
  return `<${tag}>${children}</${tag}>`;
}

export function sanitizeRichText(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!hasRichTextMarkup(raw)) return plainTextToHtml(raw);

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return plainTextToHtml(raw.replace(/<[^>]*>/g, ""));
  }

  const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
  return Array.from(doc.body.firstChild?.childNodes || []).map(cleanNode).join("");
}

export function valueToEditorHtml(value = "") {
  return sanitizeRichText(value);
}

export function richTextToPlainText(value = "") {
  const raw = String(value || "");
  if (!raw) return "";

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined" && hasRichTextMarkup(raw)) {
    const doc = new DOMParser().parseFromString(sanitizeRichText(raw), "text/html");
    return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  return raw.replace(/<[^>]*>/g, "").replace(/\u00a0/g, " ").trim();
}
