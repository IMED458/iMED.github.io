/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft } from 'lucide-react';

interface RichTextEditorProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  showWordCount?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  placeholder = 'Enter text here...',
  showWordCount = false,
  minHeight = '180px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync incoming value into contenteditable (only if different to avoid cursor jump)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
  };

  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const wordCount = value
    ? value.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block font-bold text-slate-800 text-xs">{label}</label>
      )}
      {hint && (
        <p className="text-[10px] text-slate-500 italic">{hint}</p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-slate-100 border border-b-0 border-slate-300 rounded-t-lg p-1.5">
        <ToolbarBtn title="Bold" onClick={() => execCmd('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => execCmd('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" onClick={() => execCmd('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Bullet list" onClick={() => execCmd('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => execCmd('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Remove formatting" onClick={() => execCmd('removeFormat')}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-b-lg p-3 font-serif text-[14px] leading-relaxed focus:ring-1 focus:ring-teal-600 focus:outline-none text-slate-800 rich-editor-area"
        style={{ minHeight }}
      />

      {showWordCount && (
        <span className="text-[10px] text-slate-400 font-mono italic">
          Word count: {wordCount}
        </span>
      )}

      <style>{`
        .rich-editor-area:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editor-area ul { list-style: disc; padding-left: 1.5em; }
        .rich-editor-area ol { list-style: decimal; padding-left: 1.5em; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // Don't blur editor
        onClick();
      }}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
    >
      {children}
    </button>
  );
}
