import { richTextToPlainText, sanitizeRichText } from "../lib/richText";

export default function RichTextContent({ value, className = "", empty = "-" }) {
  const plain = richTextToPlainText(value);

  if (!plain) {
    return <div className={`pp-rich-text ${className}`}>{empty}</div>;
  }

  return (
    <div
      className={`pp-rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
