/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent, ClipboardEvent, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Image, Table2, ChartNoAxesColumn, Superscript, Subscript, X } from 'lucide-react';

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
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);
  const [showTablePaste, setShowTablePaste] = useState(false);
  const [showDiagramPaste, setShowDiagramPaste] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [insertTitle, setInsertTitle] = useState('');
  const [insertLegend, setInsertLegend] = useState('');

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

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    handleInput();
    saveSelection();
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
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table" contenteditable="false" draggable="true">${html}<figcaption><strong>${escapeHtml(insertTitle || 'Table')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption></figure><p><br></p>`);
    setPasteBuffer('');
    setInsertTitle('');
    setInsertLegend('');
    setShowTablePaste(false);
  };

  const insertDiagramFromText = () => {
    if (!pasteBuffer.trim()) return;
    const content = pasteBuffer.includes('<svg') || pasteBuffer.includes('<img') || pasteBuffer.includes('<table')
      ? pasteBuffer
      : `<pre>${escapeHtml(pasteBuffer)}</pre>`;
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-diagram" contenteditable="false" draggable="true">${content}<figcaption><strong>${escapeHtml(insertTitle || 'Diagram')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption></figure><p><br></p>`);
    setPasteBuffer('');
    setInsertTitle('');
    setInsertLegend('');
    setShowDiagramPaste(false);
  };

  const insertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-figure" contenteditable="false" draggable="true"><img src="${reader.result}" alt="${escapeHtml(file.name)}"><figcaption>${escapeHtml(file.name)}</figcaption></figure><p><br></p>`);
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
      return;
    }
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    if (html.includes('<table')) {
      event.preventDefault();
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table" contenteditable="false" draggable="true">${html}<figcaption><strong>Table.</strong> Add title and legend...</figcaption></figure><p><br></p>`);
      return;
    }
    if (text) {
      event.preventDefault();
      insertHtml(escapeHtml(text).replace(/\n/g, '<br>'));
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
        <ToolbarBtn title="Superscript" onClick={() => execCmd('superscript')}>
          <Superscript className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Subscript" onClick={() => execCmd('subscript')}>
          <Subscript className="h-3.5 w-3.5" />
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
        <ToolbarBtn title="Paste table at cursor" onClick={() => { saveSelection(); setShowTablePaste(true); setShowDiagramPaste(false); }}>
          <Table2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Paste diagram at cursor" onClick={() => { saveSelection(); setShowDiagramPaste(true); setShowTablePaste(false); }}>
          <ChartNoAxesColumn className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {(showTablePaste || showDiagramPaste) && (
        <div className="fixed inset-0 z-60 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-sm shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-xl text-slate-900">{showTablePaste ? 'Insert Table' : 'Insert Diagram'}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {showTablePaste ? 'Create your table in Excel, Word, PowerPoint, Google Docs or Sheets, then paste it here.' : 'Paste SVG/HTML, chart markup, or diagram text. It will be inserted exactly where the cursor was.'}
                </p>
              </div>
              <button type="button" onClick={() => { setShowTablePaste(false); setShowDiagramPaste(false); }} className="p-1 text-slate-500 hover:text-slate-900">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="border border-slate-300">
                <div className="flex gap-2 p-2 border-b bg-slate-50 text-slate-700">
                  <Bold className="h-4 w-4" />
                  <Italic className="h-4 w-4" />
                  <Superscript className="h-4 w-4" />
                  <Subscript className="h-4 w-4" />
                </div>
          <textarea
            value={pasteBuffer}
            onChange={(event) => setPasteBuffer(event.target.value)}
                  rows={8}
                  placeholder={showTablePaste ? 'Paste table here. Required before Insert.' : 'Paste diagram here. Required before Insert.'}
                  className="w-full bg-white p-5 text-sm font-sans focus:outline-none resize-y"
          />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Title <span className="text-red-600">*</span></label>
                <input
                  value={insertTitle}
                  onChange={(event) => setInsertTitle(event.target.value)}
                  placeholder={showTablePaste ? 'Table 1: Enter your descriptive title here (required). Do not include reference citations.' : 'Figure 1: Enter your diagram title here (required).'}
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="border border-slate-300">
                <div className="flex gap-2 p-2 border-b bg-slate-50 text-slate-700">
                  <Italic className="h-4 w-4" />
                  <Superscript className="h-4 w-4" />
                  <Subscript className="h-4 w-4" />
                </div>
                <textarea
                  value={insertLegend}
                  onChange={(event) => setInsertLegend(event.target.value)}
                  rows={4}
                  placeholder="Enter your legend here (optional). Please include abbreviation definitions and reference citations here."
                  className="w-full bg-white p-5 text-sm focus:outline-none resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
            <button type="button" onClick={() => { setPasteBuffer(''); setInsertTitle(''); setInsertLegend(''); setShowTablePaste(false); setShowDiagramPaste(false); }} className="px-5 py-2 text-sm font-semibold border rounded-md text-slate-600 bg-white">
              Cancel
            </button>
            <button type="button" disabled={!pasteBuffer.trim() || !insertTitle.trim()} onClick={showTablePaste ? insertTableFromText : insertDiagramFromText} className="px-5 py-2 text-sm font-semibold rounded-md bg-sky-300 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Insert
            </button>
            </div>
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
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
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
        .gbmn-inline-media { break-inside: avoid; margin: 12px 0; border: 1px solid #cbd5e1; padding: 8px; background: #fff; cursor: move; }
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
