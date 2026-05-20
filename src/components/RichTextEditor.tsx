/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent, ClipboardEvent, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Image, Table2, ChartNoAxesColumn } from 'lucide-react';

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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const [showTablePaste, setShowTablePaste] = useState(false);
  const [showDiagramPaste, setShowDiagramPaste] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState('');

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

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    handleInput();
  };

  const escapeHtml = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const tableFromDelimitedText = (text: string) => {
    const rows = text.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,/).map(cell => cell.trim()));
    if (rows.length === 0) return '';
    return `<table class="gbmn-inline-table"><tbody>${rows.map((row, rIdx) => (
      `<tr>${row.map(cell => rIdx === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )).join('')}</tbody></table>`;
  };

  const insertTableFromText = () => {
    const html = pasteBuffer.includes('<table')
      ? pasteBuffer
      : tableFromDelimitedText(pasteBuffer);
    if (!html) return;
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table">${html}<figcaption>Table caption...</figcaption></figure><p><br></p>`);
    setPasteBuffer('');
    setShowTablePaste(false);
  };

  const insertDiagramFromText = () => {
    if (!pasteBuffer.trim()) return;
    const content = pasteBuffer.includes('<svg') || pasteBuffer.includes('<img') || pasteBuffer.includes('<table')
      ? pasteBuffer
      : `<pre>${escapeHtml(pasteBuffer)}</pre>`;
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-diagram">${content}<figcaption>Diagram caption...</figcaption></figure><p><br></p>`);
    setPasteBuffer('');
    setShowDiagramPaste(false);
  };

  const insertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-figure"><img src="${reader.result}" alt="${escapeHtml(file.name)}"><figcaption>${escapeHtml(file.name)}</figcaption></figure><p><br></p>`);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) insertImageFile(file);
    event.target.value = '';
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'));
    if (imageFile) {
      event.preventDefault();
      insertImageFile(imageFile);
    }
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
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Insert image at cursor" onClick={() => imageInputRef.current?.click()}>
          <Image className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Paste table at cursor" onClick={() => { setShowTablePaste(prev => !prev); setShowDiagramPaste(false); }}>
          <Table2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Paste diagram at cursor" onClick={() => { setShowDiagramPaste(prev => !prev); setShowTablePaste(false); }}>
          <ChartNoAxesColumn className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {(showTablePaste || showDiagramPaste) && (
        <div className="bg-white border border-slate-300 p-2 rounded-lg space-y-2">
          <textarea
            value={pasteBuffer}
            onChange={(event) => setPasteBuffer(event.target.value)}
            rows={4}
            placeholder={showTablePaste ? 'Paste table cells from Excel, Word, or HTML table...' : 'Paste diagram SVG/HTML, exported text, or screenshot text...'}
            className="w-full bg-slate-50 border border-slate-250 rounded-md p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setPasteBuffer(''); setShowTablePaste(false); setShowDiagramPaste(false); }} className="px-3 py-1.5 text-xs font-semibold border rounded-md text-slate-600 bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={showTablePaste ? insertTableFromText : insertDiagramFromText} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-700 text-white">
              Insert
            </button>
          </div>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
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
        .gbmn-inline-media { break-inside: avoid; margin: 12px 0; border: 1px solid #cbd5e1; padding: 8px; background: #fff; }
        .gbmn-inline-media img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
        .gbmn-inline-media figcaption { margin-top: 6px; font-family: Arial, sans-serif; font-size: 11px; color: #475569; }
        .gbmn-inline-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
        .gbmn-inline-table th, .gbmn-inline-table td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        .gbmn-inline-table th { background: #f1f5f9; font-weight: 700; }
        .gbmn-inline-media-diagram pre { white-space: pre-wrap; font-family: "JetBrains Mono", monospace; font-size: 11px; background: #f8fafc; padding: 8px; }
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
