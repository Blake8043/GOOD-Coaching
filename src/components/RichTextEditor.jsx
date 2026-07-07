import { useEffect, useRef, useState } from "react";
import { FaBold, FaEraser, FaItalic, FaListOl, FaListUl, FaQuoteLeft, FaUnderline } from "react-icons/fa";
import { richTextToPlainText, sanitizeRichText, valueToEditorHtml } from "../lib/richText";

const tools = [
  { command: "bold", label: "Bold", icon: <FaBold /> },
  { command: "italic", label: "Italic", icon: <FaItalic /> },
  { command: "underline", label: "Underline", icon: <FaUnderline /> },
  { command: "insertUnorderedList", label: "Bulleted list", icon: <FaListUl /> },
  { command: "insertOrderedList", label: "Numbered list", icon: <FaListOl /> },
  { command: "formatBlock", value: "blockquote", label: "Quote", icon: <FaQuoteLeft /> },
  { command: "removeFormat", label: "Clear formatting", icon: <FaEraser /> },
];

function insertPlainText(editor, text) {
  if (!editor || !text || typeof window === "undefined") return;

  editor.focus();
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const activeRange = range && editor.contains(range.commonAncestorContainer) ? range : document.createRange();

  if (!range || !editor.contains(range.commonAncestorContainer)) {
    activeRange.selectNodeContents(editor);
    activeRange.collapse(false);
  }

  activeRange.deleteContents();

  const fragment = document.createDocumentFragment();
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement("br"));
    if (line) fragment.appendChild(document.createTextNode(line));
  });

  const lastNode = fragment.lastChild;
  activeRange.insertNode(fragment);

  if (lastNode) {
    activeRange.setStartAfter(lastNode);
    activeRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(activeRange);
  }
}

export default function RichTextEditor({
  value = "",
  onChange,
  rows = 4,
  placeholder = "",
  className = "",
  editorClassName = "",
  required = false,
  maxLength,
}) {
  const editorRef = useRef(null);
  const plainText = richTextToPlainText(value);
  const [isEmpty, setIsEmpty] = useState(!plainText);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    const next = valueToEditorHtml(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setIsEmpty(!richTextToPlainText(next));
  }, [value]);

  const emit = ({ normalize = false } = {}) => {
    const editor = editorRef.current;
    if (!editor) return;

    const clean = sanitizeRichText(editor.innerHTML);
    const plain = richTextToPlainText(clean);
    const next = plain ? clean : "";

    setIsEmpty(!plain);

    if (normalize && editor.innerHTML !== next) editor.innerHTML = next;
    onChange?.(next);
  };

  const runCommand = (tool) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(tool.command, false, tool.value || null);
    emit();
  };

  const pastePlainText = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    insertPlainText(editorRef.current, text);
    emit();
  };

  return (
    <div className={`pp-rich-editor-wrap ${className}`}>
      <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-[#12372a]/10 bg-white/70 p-1">
        {tools.map((tool) => (
          <button
            key={`${tool.command}-${tool.value || ""}`}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(tool)}
            className="grid h-9 w-9 place-items-center rounded-lg text-sm text-[#12372a] transition hover:bg-[#d9f7fb] focus:bg-[#d9f7fb] focus:outline-none"
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-required={required || undefined}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={isEmpty ? "true" : "false"}
        data-max-length={maxLength || undefined}
        onInput={emit}
        onBlur={() => emit({ normalize: true })}
        onPaste={pastePlainText}
        className={`pp-rich-editor pp-input px-4 py-3 ${editorClassName}`}
        style={{ minHeight: `${Math.max(Number(rows || 4), 2) * 1.65 + 1.3}rem` }}
      />
    </div>
  );
}
